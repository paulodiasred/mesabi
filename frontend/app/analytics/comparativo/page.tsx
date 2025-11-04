'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line } from 'recharts';
import { subDays, format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
  };
  error?: string;
}

export default function ComparativoPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<QueryResult | null>(null);
  
  // Configurações de comparação
  const [subject, setSubject] = useState<'vendas' | 'produtos' | 'items'>('vendas');
  const [measure, setMeasure] = useState<'faturamento' | 'quantidade' | 'ticket_medio' | 'customizacoes'>('faturamento');
  const [dimension, setDimension] = useState<'channel' | 'store' | 'product' | 'time'>('channel');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [comparisonType, setComparisonType] = useState<'period' | 'dimension'>('period');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    if (period !== 'custom' || (customStart && customEnd)) {
      executeQuery();
    }
  }, [subject, measure, dimension, period, customStart, customEnd, comparisonType]);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      let startDate: Date;
      let endDate: Date = now;

      if (period === 'custom') {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        startDate = subDays(now, days);
      }

      // Configurar medidas
      const measureConfig: Record<string, any> = {
        faturamento: subject === 'items' 
          ? { name: 'faturamento', aggregation: 'sum', field: 'price' }  // Para items, usar price (já inclui quantity)
          : { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
        quantidade: { name: 'quantidade', aggregation: 'count', field: 'id' },
        ticket_medio: { name: 'ticket_medio', aggregation: 'avg', field: 'total_amount' },
        customizacoes: { name: 'customizacoes', aggregation: 'count', field: 'id' }
      };

      // Configurar dimensões
      const dimensionConfig: Record<string, any> = {
        channel: { name: 'Canal', field: 'channel_id' },
        store: { name: 'Loja', field: 'store_id' },
        product: { name: 'Produto', field: 'product_id' },
        time: { name: 'Data', field: 'created_at', grouping: 'day' }
      };

      const subjectConfig = {
        vendas: 'vendas',
        produtos: 'produtos',
        items: 'items'
      };

      // Query principal
      const mainQuery: any = {
        subject: subjectConfig[subject],
        measures: [measureConfig[measure]],
        filters: [
          { field: 'created_at', op: '>=', value: format(startDate, 'yyyy-MM-dd') },
          { field: 'created_at', op: '<=', value: format(endDate, 'yyyy-MM-dd') }
        ],
        limit: 100
      };

      if (dimension !== 'time') {
        mainQuery.dimensions = [dimensionConfig[dimension]];
      } else {
        mainQuery.dimensions = [dimensionConfig[dimension]];
      }

      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mainQuery),
      });

      const data = await response.json();
      console.log('Comparativo - Data recebida:', data?.data?.[0]); // Debug: verificar se channel_name está vindo

      // Query de comparação
      let comparisonData: any = null;
      if (comparisonType === 'period') {
        // Comparar com período anterior
        const prevStartDate = subDays(startDate, days);
        const prevEndDate = subDays(endDate, days); // Corrigido: usar endDate como base, não startDate

        const comparisonQuery = {
          ...mainQuery,
          filters: [
            { field: 'created_at', op: '>=', value: format(prevStartDate, 'yyyy-MM-dd') },
            { field: 'created_at', op: '<=', value: format(prevEndDate, 'yyyy-MM-dd') }
          ]
        };

        console.log('Comparativo - Query período anterior:', {
          prevStartDate: format(prevStartDate, 'yyyy-MM-dd'),
          prevEndDate: format(prevEndDate, 'yyyy-MM-dd'),
          query: comparisonQuery
        });

        const comparisonResponse = await fetch(`${API_URL}/query/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comparisonQuery),
        });

        comparisonData = await comparisonResponse.json();
        console.log('Comparativo - Dados período anterior recebidos:', comparisonData?.data?.length || 0, comparisonData?.data?.[0]);
      }

      setResult(data);
      setComparisonResult(comparisonData);
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  const getMergedData = () => {
    if (!result?.data) return [];
    if (!comparisonResult?.data) return result.data;

    const dimensionKey = dimension === 'channel' ? 'channel_id' : 
                         dimension === 'store' ? 'store_id' : 
                         dimension === 'product' ? 'product_id' : 'created_at';

    const measureKey = measure === 'faturamento' ? 'faturamento' : 
                       measure === 'quantidade' ? 'quantidade' : 
                       measure === 'ticket_medio' ? 'ticket_medio' : 'customizacoes';

    // Helper para normalizar chave de data para comparação
    const normalizeDateKey = (dateValue: any): string => {
      if (!dateValue) return '';
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          // Se falhar, tenta adicionar timezone
          if (typeof dateValue === 'string' && !dateValue.includes('T')) {
            const dateWithTime = new Date(dateValue + 'T00:00:00');
            if (!isNaN(dateWithTime.getTime())) {
              return dateWithTime.toISOString().split('T')[0];
            }
          }
          return String(dateValue);
        }
        return date.toISOString().split('T')[0]; // Normaliza para YYYY-MM-DD
      } catch (error) {
        return String(dateValue);
      }
    };

    // Ordenar dados por data se for dimensão de tempo, para garantir comparação correta
    const sortedCurrentData = dimension === 'time' 
      ? [...result.data].sort((a, b) => {
          try {
            const dateA = new Date(a.created_at_day || a.created_at);
            const dateB = new Date(b.created_at_day || b.created_at);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return dateA.getTime() - dateB.getTime();
          } catch {
            return 0;
          }
        })
      : result.data;
    
    const sortedPreviousData = dimension === 'time' && comparisonResult?.data && comparisonResult.data.length > 0
      ? [...comparisonResult.data].sort((a, b) => {
          try {
            const dateA = new Date(a.created_at_day || a.created_at);
            const dateB = new Date(b.created_at_day || b.created_at);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return dateA.getTime() - dateB.getTime();
          } catch {
            return 0;
          }
        })
      : comparisonResult?.data || [];

    return sortedCurrentData.map((current: any, index: number) => {
      // Para comparação por data, usa o índice (posição no período)
      // Assim comparamos dia 1 do período atual com dia 1 do período anterior
      let previous: any = null;
      
      if (dimension === 'time') {
        // Para comparação por data, usa o índice para comparar posições equivalentes
        // (dia 1 com dia 1, dia 2 com dia 2, etc.)
        if (sortedPreviousData.length > 0 && index < sortedPreviousData.length) {
          previous = sortedPreviousData[index];
        }
      } else {
        // Para outras dimensões, usa a chave normal
        const matchKey = current[dimensionKey];
        previous = sortedPreviousData.find((p: any) => {
          return p[dimensionKey] === matchKey;
        });
      }

      const currentValue = current[measureKey] || 0;
      const previousValue = previous?.[measureKey] || 0;
      const diferenca = previousValue !== 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : null;

      // Helper para formatar data com validação
      const formatDate = (dateValue: any): string => {
        if (!dateValue) return 'Data inválida';
        try {
          // Se já for uma string de data válida, tenta parsear diretamente
          let date: Date;
          if (typeof dateValue === 'string') {
            // PostgreSQL DATE_TRUNC retorna timestamps no formato ISO ou similar
            // Tenta parsear diretamente
            date = new Date(dateValue);
            // Se falhar, tenta adicionar timezone se necessário
            if (isNaN(date.getTime()) && !dateValue.includes('T')) {
              // Se não tem 'T' (formato ISO), pode ser apenas data
              date = new Date(dateValue + 'T00:00:00');
            }
          } else {
            date = new Date(dateValue);
          }
          
          if (isNaN(date.getTime())) {
            console.warn('Data inválida recebida:', dateValue);
            return String(dateValue).substring(0, 10); // Tenta mostrar pelo menos os primeiros caracteres
          }
          return format(date, 'dd/MM');
        } catch (error) {
          console.error('Erro ao formatar data:', error, dateValue);
          return String(dateValue).substring(0, 10);
        }
      };

      return {
        ...current,
        label: dimension === 'channel' 
          ? (current.channel_name || `Canal ${current.channel_id}`)?.replace(/^Canal\s+/i, '')
          : dimension === 'store'
          ? (current.store_name || `Loja ${current.store_id}`)
          : dimension === 'product'
          ? (current.product_name || `Produto ${current.product_id}`)
          : formatDate(current.created_at_day || current.created_at),
        current: currentValue,
        previous: previousValue,
        diferenca
      };
    });
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`comparativo-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const mergedData = getMergedData();
  const measureLabel = measure === 'faturamento' ? 'Faturamento (R$)' : 
                       measure === 'quantidade' ? 'Quantidade' : 
                       measure === 'ticket_medio' ? 'Ticket Médio (R$)' : 'Customizações';

  // Calcular totais para resumo
  const totalAtual = mergedData.reduce((sum, item) => sum + (item.current || 0), 0);
  const totalAnterior = mergedData.reduce((sum, item) => sum + (item.previous || 0), 0);
  const variacaoTotal = totalAnterior !== 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;

  // Obter informações do período
  const getPeriodLabel = () => {
    if (period === 'custom') {
      return customStart && customEnd 
        ? `${format(new Date(customStart), 'dd/MM/yyyy')} a ${format(new Date(customEnd), 'dd/MM/yyyy')}`
        : 'Período personalizado';
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    return `${format(startDate, 'dd/MM')} a ${format(endDate, 'dd/MM/yyyy')}`;
  };

  const getPreviousPeriodLabel = () => {
    if (period === 'custom') {
      if (!customStart || !customEnd) return 'Período anterior';
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevEndDate = startDate;
      const prevStartDate = subDays(prevEndDate, days);
      return `${format(prevStartDate, 'dd/MM/yyyy')} a ${format(prevEndDate, 'dd/MM/yyyy')}`;
    }
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const endDate = subDays(new Date(), days);
    const startDate = subDays(endDate, days);
    return `${format(startDate, 'dd/MM')} a ${format(endDate, 'dd/MM/yyyy')}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Link 
          href="/" 
          className="text-purple-600 hover:text-purple-700 mb-4 inline-flex items-center gap-2 transition-colors"
        >
          <span>←</span>
          <span>Voltar para Home</span>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Comparativo Customizado</h1>
        <p className="text-gray-600">
          Compare métricas entre períodos, canais, lojas ou produtos
        </p>
      </div>

      {/* Configurações */}
      <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white mb-6">
        <h2 className="text-xl font-semibold mb-4">Configurações do Comparativo</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Assunto</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="vendas">Vendas</option>
              <option value="produtos">Produtos</option>
              <option value="items">Items</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Métrica</label>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="faturamento">Faturamento</option>
              <option value="quantidade">Quantidade</option>
              {subject === 'vendas' && <option value="ticket_medio">Ticket Médio</option>}
              {subject === 'items' && <option value="customizacoes">Customizações</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Agrupar por</label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="channel">Canal</option>
              <option value="store">Loja</option>
              {subject !== 'vendas' && <option value="product">Produto</option>}
              <option value="time">Data</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
        </div>

        {period === 'custom' && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Data Inicial</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data Final</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={comparisonType === 'period'}
              onChange={() => setComparisonType('period')}
              className="text-purple-600"
            />
            <span>Comparar com período anterior</span>
          </label>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <label className="block text-sm font-medium">Tipo de gráfico:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="bar">Barras</option>
            <option value="line">Linhas</option>
          </select>
        </div>
      </div>

      {/* Resultados */}
      {result && (
        <div className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Resultado do Comparativo</h2>
              {comparisonResult && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Período Atual:</span> {getPeriodLabel()} | 
                  <span className="font-medium ml-2">Período Anterior:</span> {getPreviousPeriodLabel()}
                </div>
              )}
            </div>
            {result.data && result.data.length > 0 && (
              <button
                onClick={generatePDF}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
              >
                📄 Gerar PDF
              </button>
            )}
          </div>

          {result.error ? (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded">
              {result.error}
            </div>
          ) : mergedData.length > 0 ? (
            <div className="space-y-6">
              {/* Cards de Resumo */}
              {comparisonResult && (
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="border rounded-xl p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                    <div className="text-sm text-purple-700 font-medium mb-1">Período Atual</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {measure === 'faturamento' || measure === 'ticket_medio'
                        ? `R$ ${totalAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : totalAtual.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-purple-600 mt-1">{getPeriodLabel()}</div>
                  </div>
                  
                  <div className="border rounded-xl p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="text-sm text-gray-700 font-medium mb-1">Período Anterior</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {measure === 'faturamento' || measure === 'ticket_medio'
                        ? `R$ ${totalAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : totalAnterior.toLocaleString('pt-BR')}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{getPreviousPeriodLabel()}</div>
                  </div>
                  
                  <div className={`border rounded-xl p-4 bg-gradient-to-br ${
                    variacaoTotal > 0 
                      ? 'from-green-50 to-green-100' 
                      : variacaoTotal < 0 
                      ? 'from-red-50 to-red-100' 
                      : 'from-gray-50 to-gray-100'
                  }`}>
                    <div className="text-sm font-medium mb-1 flex items-center gap-2">
                      <span className={variacaoTotal > 0 ? 'text-green-700' : variacaoTotal < 0 ? 'text-red-700' : 'text-gray-700'}>
                        Variação Total
                      </span>
                      {variacaoTotal > 0 && <span className="text-green-600">↑</span>}
                      {variacaoTotal < 0 && <span className="text-red-600">↓</span>}
                      {variacaoTotal === 0 && <span className="text-gray-600">→</span>}
                    </div>
                    <div className={`text-2xl font-bold ${
                      variacaoTotal > 0 ? 'text-green-900' : variacaoTotal < 0 ? 'text-red-900' : 'text-gray-900'
                    }`}>
                      {variacaoTotal > 0 ? '+' : ''}{variacaoTotal.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {variacaoTotal > 0 ? 'Crescimento' : variacaoTotal < 0 ? 'Queda' : 'Sem variação'}
                    </div>
                  </div>
                </div>
              )}
              {/* Gráfico */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Visualização</h3>
                <ResponsiveContainer width="100%" height={400}>
                  {chartType === 'bar' ? (
                    <BarChart data={mergedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="label" 
                        angle={dimension === 'time' ? 0 : -45}
                        textAnchor={dimension === 'time' ? 'middle' : 'end'}
                        height={dimension === 'time' ? 60 : 120}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ 
                          value: measure === 'ticket_medio' ? 'R$' : '', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                        tickFormatter={(value) => {
                          if (measure === 'faturamento') {
                            // Para faturamento, mostrar em milhares sem R$ no eixo
                            return `${(value / 1000).toFixed(0)}k`;
                          }
                          if (measure === 'ticket_medio') {
                            // Para ticket médio, mostrar valores reais formatados
                            if (value < 100) {
                              return value.toFixed(0);
                            }
                            if (value < 1000) {
                              return value.toFixed(0);
                            }
                            return `${(value / 1000).toFixed(1)}k`;
                          }
                          return value.toLocaleString('pt-BR');
                        }} 
                      />
                      <Tooltip 
                        formatter={(value: any, name: string, props: any) => {
                          const formattedValue = measure === 'faturamento' || measure === 'ticket_medio'
                            ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : value.toLocaleString('pt-BR');
                          
                          if (comparisonResult && props?.payload) {
                            const diferenca = props.payload.diferenca;
                            if (diferenca !== null && diferenca !== undefined) {
                              const variacao = diferenca > 0 ? `+${diferenca.toFixed(1)}%` : `${diferenca.toFixed(1)}%`;
                              return [`${formattedValue} (${variacao})`, name];
                            }
                          }
                          return [formattedValue, name];
                        }}
                        labelFormatter={(label) => {
                          return `${label}${comparisonResult ? ' - Comparativo' : ''}`;
                        }}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="square"
                      />
                      <Bar dataKey="current" fill="#9333ea" name="Período Atual" radius={[4, 4, 0, 0]} />
                      {comparisonResult && <Bar dataKey="previous" fill="#94a3b8" name="Período Anterior" radius={[4, 4, 0, 0]} />}
                    </BarChart>
                  ) : (
                    <LineChart data={mergedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="label" 
                        angle={dimension === 'time' ? 0 : -45}
                        textAnchor={dimension === 'time' ? 'middle' : 'end'}
                        height={dimension === 'time' ? 60 : 120}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        label={{ 
                          value: measure === 'ticket_medio' ? 'R$' : '', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                        tickFormatter={(value) => {
                          if (measure === 'faturamento') {
                            // Para faturamento, mostrar em milhares sem R$ no eixo
                            return `${(value / 1000).toFixed(0)}k`;
                          }
                          if (measure === 'ticket_medio') {
                            // Para ticket médio, mostrar valores reais formatados
                            if (value < 100) {
                              return value.toFixed(0);
                            }
                            if (value < 1000) {
                              return value.toFixed(0);
                            }
                            return `${(value / 1000).toFixed(1)}k`;
                          }
                          return value.toLocaleString('pt-BR');
                        }} 
                      />
                      <Tooltip 
                        formatter={(value: any, name: string, props: any) => {
                          const formattedValue = measure === 'faturamento' || measure === 'ticket_medio'
                            ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : value.toLocaleString('pt-BR');
                          
                          if (comparisonResult && props?.payload) {
                            const diferenca = props.payload.diferenca;
                            if (diferenca !== null && diferenca !== undefined) {
                              const variacao = diferenca > 0 ? `+${diferenca.toFixed(1)}%` : `${diferenca.toFixed(1)}%`;
                              return [`${formattedValue} (${variacao})`, name];
                            }
                          }
                          return [formattedValue, name];
                        }}
                        labelFormatter={(label) => {
                          return `${label}${comparisonResult ? ' - Comparativo' : ''}`;
                        }}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="current" 
                        stroke="#9333ea" 
                        strokeWidth={3} 
                        name="Período Atual"
                        dot={{ fill: '#9333ea', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      {comparisonResult && (
                        <Line 
                          type="monotone" 
                          dataKey="previous" 
                          stroke="#94a3b8" 
                          strokeWidth={2} 
                          strokeDasharray="5 5"
                          name="Período Anterior"
                          dot={{ fill: '#94a3b8', r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      )}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Tabela */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Dados Detalhados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-3 text-left font-semibold">
                          {dimension === 'channel' ? 'Canal' : dimension === 'store' ? 'Loja' : dimension === 'product' ? 'Produto' : 'Data'}
                        </th>
                        <th className="border p-3 text-right font-semibold">{measureLabel} - Atual</th>
                        {comparisonResult && (
                          <>
                            <th className="border p-3 text-right font-semibold">{measureLabel} - Anterior</th>
                            <th className="border p-3 text-right font-semibold">Variação</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {mergedData.map((row: any, index: number) => (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-50 transition-colors ${
                            comparisonResult && row.diferenca !== null && Math.abs(row.diferenca) > 10
                              ? row.diferenca > 0 
                                ? 'bg-green-50/50' 
                                : 'bg-red-50/50'
                              : ''
                          }`}
                        >
                          <td className="border p-3 font-medium">
                            <div className="flex items-center gap-2">
                              {row.label}
                              {comparisonResult && row.diferenca !== null && Math.abs(row.diferenca) > 10 && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  row.diferenca > 0 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {row.diferenca > 0 ? '↑' : '↓'} {Math.abs(row.diferenca).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`border p-3 text-right font-semibold ${
                            comparisonResult && row.diferenca !== null && row.diferenca > 0 
                              ? 'text-purple-700' 
                              : ''
                          }`}>
                            {measure === 'faturamento' || measure === 'ticket_medio' 
                              ? `R$ ${row.current.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : row.current.toLocaleString('pt-BR')}
                          </td>
                          {comparisonResult && (
                            <>
                              <td className="border p-3 text-right text-gray-600">
                                {measure === 'faturamento' || measure === 'ticket_medio'
                                  ? `R$ ${row.previous.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : row.previous.toLocaleString('pt-BR')}
                              </td>
                              <td className={`border p-3 text-right font-bold ${
                                row.diferenca === null 
                                  ? 'text-gray-400' 
                                  : row.diferenca > 0 
                                  ? 'text-green-600 bg-green-50' 
                                  : row.diferenca < 0
                                  ? 'text-red-600 bg-red-50'
                                  : 'text-gray-600'
                              }`}>
                                {row.diferenca === null ? (
                                  <span className="text-gray-400">-</span>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    {row.diferenca > 0 ? (
                                      <span className="text-green-600">↑</span>
                                    ) : row.diferenca < 0 ? (
                                      <span className="text-red-600">↓</span>
                                    ) : (
                                      <span className="text-gray-400">→</span>
                                    )}
                                    <span>
                                      {row.diferenca > 0 ? '+' : ''}{row.diferenca.toFixed(1)}%
                                    </span>
                                  </div>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}

