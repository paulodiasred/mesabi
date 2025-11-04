'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getHubForPage, getHubName } from '../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ProductCombo {
  produto1_id: number;
  produto1_nome: string;
  produto2_id: number;
  produto2_nome: string;
  vezes_juntos: number;
  receita_total: number;
  ticket_medio: number;
}

interface QueryResult {
  data: ProductCombo[];
  metadata?: {
    totalRows: number;
    executionTime: number;
    warning?: string;
  };
  error?: string;
}

export default function MixProdutosPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [expandedTable, setExpandedTable] = useState(false);
  const [chartItemsToShow, setChartItemsToShow] = useState(10); // Mostrar top 10 por padrão
  const minOccurrences = 1; // Valor fixo: mostrar todas as combinações
  const [debugInfo, setDebugInfo] = useState<{totalVendas: number; totalCombos: number; maxOccurrences: number} | null>(null);
  const maxResults = 500; // Mostrar até 500 combinações

  useEffect(() => {
    executeQuery();
  }, []); // Executar apenas uma vez ao carregar

  const executeQuery = async () => {
    setLoading(true);
    try {
      // Calcular período (últimos 180 dias)
      const startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Usar o novo endpoint que calcula combinações diretamente no banco
      const params = new URLSearchParams({
        minOccurrences: minOccurrences.toString(),
        startDate: startDate
      });
      
      const combinationsResponse = await fetch(`${API_URL}/query/product-combinations?${params}`);
      
      if (!combinationsResponse.ok) {
        const errorData = await combinationsResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro HTTP: ${combinationsResponse.status}`);
      }

      const combinationsData = await combinationsResponse.json();
      
      console.log('Combinações recebidas do backend:', {
        totalRows: combinationsData.data?.length || 0,
        metadata: combinationsData.metadata,
        firstRow: combinationsData.data?.[0]
      });
      
      if (!combinationsData.data || !Array.isArray(combinationsData.data)) {
        console.error('Resposta inválida do backend:', combinationsData);
        setResult({ 
          data: [], 
          error: combinationsData.error || combinationsData.message || 'Formato de dados inválido do backend' 
        });
        return;
      }
      
      if (combinationsData.data.length === 0) {
        setResult({ 
          data: [], 
          error: `Nenhuma combinação encontrada com mínimo de ${minOccurrences} ocorrências no período selecionado` 
        });
        return;
      }

      // Coletar IDs únicos de produtos para buscar nomes
      const productIds = new Set<number>();
      combinationsData.data.forEach((row: any) => {
        productIds.add(Number(row.produto1_id));
        productIds.add(Number(row.produto2_id));
      });

      // Buscar nomes dos produtos
      const productNamesMap = new Map<number, string>();
      try {
        const productsResponse = await fetch(`${API_URL}/query/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'produtos',
            dimensions: [{ name: 'Produto', field: 'product_id' }],
            filters: [
              { field: 'product_id', op: 'in', value: Array.from(productIds) }
            ],
            limit: 1000
          }),
        });
        const productsData = await productsResponse.json();
        if (productsData.data && Array.isArray(productsData.data)) {
          productsData.data.forEach((p: any) => {
            const id = Number(p.product_id || p.Produto);
            const name = p.product_name || `Produto ${id}`;
            productNamesMap.set(id, name);
          });
        }
      } catch (error) {
        console.warn('Erro ao buscar nomes dos produtos:', error);
      }

      // Processar combinações e adicionar nomes
      const allCombos: ProductCombo[] = combinationsData.data.map((row: any) => {
        const produto1_id = Number(row.produto1_id);
        const produto2_id = Number(row.produto2_id);
        return {
          produto1_id,
          produto1_nome: productNamesMap.get(produto1_id) || `Produto ${produto1_id}`,
          produto2_id,
          produto2_nome: productNamesMap.get(produto2_id) || `Produto ${produto2_id}`,
          vezes_juntos: Number(row.vezes_juntos),
          receita_total: Number(row.receita_total),
          ticket_medio: Number(row.ticket_medio)
        };
      });

      const maxOccurrences = allCombos.length > 0 ? Math.max(...allCombos.map(c => c.vezes_juntos)) : 0;
      
      console.log(`Total de combinações encontradas: ${allCombos.length}`);
      console.log(`Máximo de ocorrências: ${maxOccurrences}`);
      
      // Atualizar debug info
      setDebugInfo({
        totalVendas: 0, // Não temos mais essa informação
        totalCombos: allCombos.length,
        maxOccurrences: maxOccurrences
      });
      
      // Agrupar por número de ocorrências e limitar cada grupo para mostrar mais variações
      const combosByOccurrences = new Map<number, typeof allCombos>();
      
      allCombos
        .filter(c => c.vezes_juntos >= minOccurrences)
        .forEach(c => {
          const vezes = c.vezes_juntos;
          if (!combosByOccurrences.has(vezes)) {
            combosByOccurrences.set(vezes, []);
          }
          combosByOccurrences.get(vezes)!.push(c);
        });
      
      // Limitar cada grupo de ocorrências para mostrar mais variações
      let maxPerOccurrence: number;
      if (minOccurrences >= 50) {
        maxPerOccurrence = 3;
      } else if (minOccurrences >= 20) {
        maxPerOccurrence = 5;
      } else if (minOccurrences >= 10) {
        maxPerOccurrence = 8;
      } else if (minOccurrences >= 5) {
        maxPerOccurrence = 15;
      } else {
        maxPerOccurrence = 25;
      }
      
      const limitedCombos: typeof allCombos = [];
      const sortedOccurrences = Array.from(combosByOccurrences.keys()).sort((a, b) => b - a);
      
      for (const vezes of sortedOccurrences) {
        const combos = combosByOccurrences.get(vezes)!;
        const sorted = combos.sort((a, b) => b.receita_total - a.receita_total);
        limitedCombos.push(...sorted.slice(0, maxPerOccurrence));
        if (limitedCombos.length >= maxResults) break;
      }
      
      const combosArray = limitedCombos
        .map((c, index) => {
          return {
            ...c,
            combo_label: `#${index + 1}`, // Usar numeração sequencial no eixo X
            combo_label_full: `${c.produto1_nome} + ${c.produto2_nome}` // Label completo para tooltip
          };
        })
        .sort((a, b) => b.vezes_juntos - a.vezes_juntos);
      
      if (combosArray.length === 0 && allCombos.length > 0) {
        // Se há combinações mas nenhuma passa no filtro
        const topCombos = allCombos
          .sort((a, b) => b.vezes_juntos - a.vezes_juntos)
          .slice(0, maxResults)
          .map((c, index) => ({
            ...c,
            combo_label: `#${index + 1}`,
            combo_label_full: `${c.produto1_nome} + ${c.produto2_nome}`
          }));
        
        setResult({
          data: topCombos,
          metadata: {
            totalRows: topCombos.length,
            executionTime: combinationsData.metadata?.executionTime || 0,
            warning: `Filtro de ${minOccurrences} ocorrências é muito alto. Máximo encontrado: ${maxOccurrences}.`
          }
        });
      } else {
        setResult({
          data: combosArray,
          metadata: {
            totalRows: combosArray.length,
            executionTime: combinationsData.metadata?.executionTime || 0
          }
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      setResult({ 
        data: [], 
        error: error.message || 'Erro ao executar query. Verifique se o backend está rodando.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const wasExpanded = expandedTable;
    if (!wasExpanded) setExpandedTable(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
    
    pdf.save(`mix-produtos-${new Date().toISOString().split('T')[0]}.pdf`);
    
    if (!wasExpanded) setExpandedTable(false);
  };

  const hubPath = getHubForPage('/analytics/mix-produtos');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        {hubPath && (
          <Link 
            href={hubPath} 
            className="text-purple-600 hover:text-purple-700 mb-4 inline-flex items-center gap-2 transition-colors"
          >
            <span>←</span>
            <span>Voltar para {getHubName(hubPath)}</span>
          </Link>
        )}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🍽️ Mix de Produtos</h1>
        <p className="text-gray-600">
          Descubra quais produtos são frequentemente comprados juntos
        </p>
      </div>

      {/* Filtros e Info */}
      <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
        <div className="space-y-4">
          
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-700">Máximo de combinações:</span>
            <span className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border border-purple-200">
              {maxResults}
            </span>
          </div>
        </div>
        
        {debugInfo && (
          <div className="mt-3 pt-3 border-t border-purple-200 text-xs text-gray-600">
            <span className="font-semibold">Estatísticas:</span> {debugInfo.totalVendas} vendas processadas • {debugInfo.totalCombos} combinações encontradas • Máximo: {debugInfo.maxOccurrences} ocorrências
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analisando combinações de produtos...</p>
        </div>
      )}

      {result && !loading && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Top Combinações de Produtos</h2>
            <div className="flex items-center gap-4">
              {result.metadata && (
                <span className="text-sm text-muted-foreground">
                  {result.metadata.totalRows} combinações • {result.metadata.executionTime}ms
                </span>
              )}
              {result.data && result.data.length > 0 && (
                <button
                  onClick={generatePDF}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  📄 Gerar PDF
                </button>
              )}
            </div>
          </div>

          {result.error ? (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
              {result.error}
            </div>
          ) : result.metadata?.warning ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
              <p className="font-semibold">⚠️ Aviso</p>
              <p className="text-sm">{result.metadata.warning}</p>
            </div>
          ) : null}
          
          {result.data && result.data.length > 0 ? (
            <div className="space-y-6">
              {/* Gráfico */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Top Combinações de Produtos</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Mostrar:</span>
                    <select
                      value={chartItemsToShow}
                      onChange={(e) => setChartItemsToShow(Number(e.target.value))}
                      className="px-3 py-1.5 border border-purple-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={10}>Top 10</option>
                      <option value={25}>Top 25</option>
                      <option value={50}>Top 50</option>
                      <option value={100}>Top 100</option>
                      <option value={result.data.length}>Todos ({result.data.length})</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-4 px-4">
                  <div style={{ minWidth: `${Math.max(800, chartItemsToShow * 60)}px` }}>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={result.data.slice(0, chartItemsToShow)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="combo_label"
                          tick={{ fontSize: 12 }}
                          interval={0}
                        />
                        <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString('pt-BR')}
                          labelFormatter={(label: string, payload: any) => {
                            // Usar o label completo no tooltip se existir
                            return payload?.[0]?.payload?.combo_label_full || label;
                          }}
                          contentStyle={{ maxWidth: '400px', whiteSpace: 'normal' }}
                        />
                        <Legend />
                        <Bar dataKey="vezes_juntos" fill="#9333ea" name="Vezes Juntos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {chartItemsToShow < result.data.length && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Mostrando {chartItemsToShow} de {result.data.length} combinações. Use o seletor acima para ver mais ou arraste o gráfico.
                  </p>
                )}
              </div>

              {/* Tabela */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Detalhes</h3>
                  {result.data.length > 10 && (
                    <button
                      onClick={() => setExpandedTable(!expandedTable)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {expandedTable ? 'Ver menos' : 'Ver todos'}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-3 text-center font-semibold w-16">#</th>
                        <th className="border p-3 text-left font-semibold">Produto 1</th>
                        <th className="border p-3 text-left font-semibold">Produto 2</th>
                        <th className="border p-3 text-right font-semibold">Vezes Juntos</th>
                        <th className="border p-3 text-right font-semibold">Receita Total</th>
                        <th className="border p-3 text-right font-semibold">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(expandedTable ? result.data : result.data.slice(0, 10)).map((combo: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border p-3 text-center font-semibold text-purple-600">{combo.combo_label}</td>
                          <td className="border p-3 font-medium">{combo.produto1_nome}</td>
                          <td className="border p-3 font-medium">{combo.produto2_nome}</td>
                          <td className="border p-3 text-right">{combo.vezes_juntos.toLocaleString('pt-BR')}</td>
                          <td className="border p-3 text-right">
                            R$ {combo.receita_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border p-3 text-right">
                            R$ {combo.ticket_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma combinação encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}

