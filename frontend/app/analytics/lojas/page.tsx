'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { subDays } from 'date-fns';
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

export default function LojasAnalyticsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [metric, setMetric] = useState<'faturamento' | 'vendas' | 'ticket_medio' | 'tempo_entrega'>('faturamento');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [expandedTable, setExpandedTable] = useState(false);

  useEffect(() => {
    executeQuery();
  }, [period, metric]);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(now, days);

      let measures: any[];
      let filters: any[] = [
        {
          field: 'created_at',
          op: '>=',
          value: startDate.toISOString().split('T')[0]
        }
      ];

      // Configurar medidas e filtros baseado na métrica selecionada
      if (metric === 'tempo_entrega') {
        // Para tempo de entrega, precisamos filtrar por canais de delivery
        filters.push({
          field: 'channel_id',
          op: 'in',
          value: [2, 3, 4, 5, 6] // Canais de delivery
        });
        measures = [
          { name: 'tempo_medio', aggregation: 'avg', field: 'delivery_seconds' },
          { name: 'total_entregas', aggregation: 'count', field: 'id' }
        ];
      } else if (metric === 'ticket_medio') {
        measures = [
          { name: 'ticket_medio', aggregation: 'avg', field: 'total_amount' },
          { name: 'total_vendas', aggregation: 'count', field: 'id' }
        ];
      } else if (metric === 'vendas') {
        measures = [
          { name: 'total_vendas', aggregation: 'count', field: 'id' }
        ];
      } else { // faturamento
        measures = [
          { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
          { name: 'total_vendas', aggregation: 'count', field: 'id' }
        ];
      }

      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures,
          dimensions: [{ name: 'Loja', field: 'store_id' }],
          filters,
          limit: 50
        }),
      });

      const data = await response.json();
      
      // Processar dados baseado na métrica
      const processed = (data.data || []).map((row: any) => {
        let value = 0;
        if (metric === 'tempo_entrega') {
          value = row.tempo_medio && typeof row.tempo_medio === 'number' 
            ? Number((row.tempo_medio / 60).toFixed(1))
            : 0;
        } else if (metric === 'ticket_medio') {
          value = row.ticket_medio || 0;
        } else if (metric === 'vendas') {
          value = row.total_vendas || 0;
        } else {
          value = row.faturamento || 0;
        }
        
        return {
          ...row,
          value,
          display_name: row.store_name || `Loja ${row.store_id}`
        };
      });

      // Ordenar por valor (descendente)
      processed.sort((a: any, b: any) => b.value - a.value);

      setResult({ ...data, data: processed });
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'faturamento': return 'Faturamento';
      case 'vendas': return 'Total de Vendas';
      case 'ticket_medio': return 'Ticket Médio';
      case 'tempo_entrega': return 'Tempo Médio de Entrega';
    }
  };

  const formatValue = (value: number) => {
    if (metric === 'tempo_entrega') {
      return `${value.toFixed(1)} min`;
    } else if (metric === 'ticket_medio' || metric === 'faturamento') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } else {
      return value.toLocaleString('pt-BR');
    }
  };

  const getChartColor = () => {
    switch (metric) {
      case 'faturamento': return '#9333ea';
      case 'vendas': return '#3b82f6';
      case 'ticket_medio': return '#10b981';
      case 'tempo_entrega': return '#f59e0b';
    }
  };

  const sortedData = result?.data || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏪 Performance das Lojas</h1>
        <p className="text-gray-600">
          Compare o desempenho de todas as lojas
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setMetric('faturamento')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              metric === 'faturamento'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💰 Faturamento
          </button>
          <button
            onClick={() => setMetric('vendas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              metric === 'vendas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🛒 Vendas
          </button>
          <button
            onClick={() => setMetric('ticket_medio')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              metric === 'ticket_medio'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💳 Ticket Médio
          </button>
          <button
            onClick={() => setMetric('tempo_entrega')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              metric === 'tempo_entrega'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚚 Tempo de Entrega
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('7d')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === '7d'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === '30d'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriod('90d')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === '90d'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 dias
          </button>
        </div>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          {result.error ? (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
              {result.error}
            </div>
          ) : result.data && result.data.length > 0 ? (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={async () => {
                    if (!reportRef.current) return;
                    // Expandir tabela antes de gerar PDF
                    const wasExpanded = expandedTable;
                    if (!expandedTable) setExpandedTable(true);
                    // Aguardar renderização
                    await new Promise(resolve => setTimeout(resolve, 100));
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
                    pdf.save(`performance-lojas-${metric}-${new Date().toISOString().split('T')[0]}.pdf`);
                    // Restaurar estado anterior
                    if (!wasExpanded) setExpandedTable(false);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  📄 Gerar PDF
                </button>
              </div>
              {/* Chart */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  {getMetricLabel()} por Loja
                </h3>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={sortedData.slice(0, 30)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="display_name"
                      angle={-90}
                      textAnchor="end"
                      height={180}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => {
                        if (metric === 'tempo_entrega') return `${value}`;
                        if (metric === 'ticket_medio') {
                          if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                          return `R$ ${value.toFixed(0)}`;
                        }
                        if (metric === 'faturamento') return `${(value / 1000).toFixed(0)}k`;
                        if (metric === 'vendas') return value.toLocaleString('pt-BR');
                        return `${(value / 1000).toFixed(0)}k`;
                      }}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatValue(value)}
                    />
                    <Bar dataKey="value" fill={getChartColor()} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{getMetricLabel()} por Loja</h3>
                  {!expandedTable && sortedData.length > 10 && (
                    <button
                      onClick={() => setExpandedTable(true)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Ver todos ({sortedData.length})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Loja</th>
                        <th className="text-right p-3 font-semibold">
                          <div className="flex flex-col items-end">
                            {(metric === 'faturamento' || metric === 'ticket_medio') && (
                              <span className="text-xs font-normal text-gray-600 mb-1"></span>
                            )}
                            {(metric === 'tempo_entrega') && (
                              <span className="text-xs font-normal text-gray-600 mb-1">min</span>
                            )}
                            <span>{metric === 'faturamento' ? 'Faturamento' : metric === 'vendas' ? 'Total Vendas' : metric === 'ticket_medio' ? 'Ticket Médio' : 'Tempo de Entrega'}</span>
                          </div>
                        </th>
                        {metric === 'tempo_entrega' && (
                          <th className="text-right p-3 font-semibold">Total Entregas</th>
                        )}
                        {metric !== 'tempo_entrega' && (
                          <th className="text-right p-3 font-semibold">Total Vendas</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.slice(0, expandedTable ? 1000 : 10).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-purple-50/50 transition-colors">
                          <td className="p-3 font-medium">{row.display_name}</td>
                          <td className="p-3 text-right font-semibold">
                            {formatValue(row.value)}
                          </td>
                          <td className="p-3 text-right text-gray-700">
                            {metric === 'tempo_entrega' 
                              ? (row.total_entregas?.toLocaleString('pt-BR') || '0')
                              : (row.total_vendas?.toLocaleString('pt-BR') || '0')
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {expandedTable && sortedData.length > 10 && (
                  <button
                    onClick={() => setExpandedTable(false)}
                    className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum dado encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}

