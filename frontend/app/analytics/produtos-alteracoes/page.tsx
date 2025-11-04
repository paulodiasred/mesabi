'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getHubForPage, getHubName } from '../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
    sql: string;
  };
  error?: string;
}

export default function ProdutosAlteracoesAnalyticsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [expandedTable, setExpandedTable] = useState(false);
  const [chartItemsToShow, setChartItemsToShow] = useState(10);
  const [customizacoesDetalhes, setCustomizacoesDetalhes] = useState<Record<number, any[]>>({});
  const [loadingDetalhes, setLoadingDetalhes] = useState<Record<number, boolean>>({});
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  useEffect(() => {
    executeQuery();
  }, []);

  const executeQuery = async () => {
    setLoading(true);
    try {
      // Query para produtos que recebem mais customizações
      // Contamos quantos items foram adicionados a cada produto
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'items',
          measures: [
            { name: 'total_customizacoes', aggregation: 'count', field: 'id' }
          ],
          dimensions: [{ name: 'Produto', field: 'product_id' }],
          orderBy: {
            field: 'total_customizacoes',
            direction: 'desc'
          },
          limit: 50
        }),
      });

      const data = await response.json();
      console.log('Produtos alterações query response:', data);
      
      setResult(data);
      if (data.error) {
        console.error('Query error:', data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  const carregarDetalhesCustomizacoes = async (productId: number) => {
    if (customizacoesDetalhes[productId]) {
      // Já carregamos, apenas expandir/colapsar
      setExpandedProduct(expandedProduct === productId ? null : productId);
      return;
    }

    setLoadingDetalhes(prev => ({ ...prev, [productId]: true }));
    setExpandedProduct(productId);

    try {
      // Buscar os itens mais utilizados como customização para este produto
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'items',
          measures: [
            { name: 'quantidade', aggregation: 'sum', field: 'quantity' },
            { name: 'vezes_adicionado', aggregation: 'count', field: 'id' }
          ],
          dimensions: [
            { name: 'Item', field: 'item_id' },
            { name: 'Produto', field: 'product_id' }
          ],
          filters: [
            { field: 'product_id', op: '=', value: productId }
          ],
          orderBy: {
            field: 'vezes_adicionado',
            direction: 'desc'
          },
          limit: 20
        }),
      });

      const data = await response.json();
      if (data.data && !data.error) {
        setCustomizacoesDetalhes(prev => ({
          ...prev,
          [productId]: data.data
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoadingDetalhes(prev => ({ ...prev, [productId]: false }));
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
    
    pdf.save(`produtos-com-mais-alteracoes-${new Date().toISOString().split('T')[0]}.pdf`);
    
    if (!wasExpanded) setExpandedTable(false);
  };

  const hubPath = getHubForPage('/analytics/produtos-alteracoes');

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Produtos com Mais Alterações</h1>
        <p className="text-gray-600">
          Descubra quais produtos recebem mais customizações e itens adicionais
        </p>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Top Produtos por Customizações</h2>
            <div className="flex items-center gap-4">
              {result.metadata && (
                <span className="text-sm text-muted-foreground">
                  {result.metadata.totalRows} linhas • {result.metadata.executionTime}ms
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
          ) : result.data && result.data.length > 0 ? (
            <div className="space-y-6">
              {/* Chart Controls */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Gráfico de Customizações</h3>
                <select
                  value={chartItemsToShow}
                  onChange={(e) => setChartItemsToShow(Number(e.target.value))}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={10}>Top 10</option>
                  <option value={25}>Top 25</option>
                  <option value={50}>Top 50</option>
                  <option value={result.data.length}>Todos</option>
                </select>
              </div>

              {/* Chart */}
              <div className="overflow-x-auto" style={{ minWidth: `${Math.min(chartItemsToShow, result.data.length) * 80}px` }}>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={result.data.slice(0, chartItemsToShow).map((item: any, index: number) => ({
                    ...item,
                    chart_label: `#${index + 1}`,
                    product_name_full: item.product_name || `Produto ${item.product_id}`,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="chart_label"
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                    <Tooltip 
                      labelFormatter={(label) => {
                        const item = result.data.find((d: any, i: number) => `#${i + 1}` === label);
                        return item?.product_name || `Produto ${item?.product_id}` || label;
                      }}
                      formatter={(value: any) => [`${value.toLocaleString('pt-BR')} customizações`, 'Total de Customizações']}
                    />
                    <Legend />
                    <Bar dataKey="total_customizacoes" fill="#9333ea" name="Total de Customizações" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Mostrando {Math.min(chartItemsToShow, result.data.length)} de {result.data.length} produtos. 
                Use a barra de rolagem horizontal para ver mais itens no gráfico.
              </p>

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
                        <th className="border p-3 text-left font-semibold">Produto</th>
                        <th className="border p-3 text-right font-semibold">Total de Customizações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(expandedTable ? result.data : result.data.slice(0, 10)).map((row: any, index: number) => {
                        const productId = row.product_id;
                        const isExpanded = expandedProduct === productId;
                        const detalhes = customizacoesDetalhes[productId] || [];
                        const isLoading = loadingDetalhes[productId];

                        return (
                          <>
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border p-3 text-center text-gray-500 font-medium">{index + 1}</td>
                              <td className="border p-3 font-medium">
                                <div className="flex items-center justify-between">
                                  <span>{row.product_name || `Produto ${row.product_id}`}</span>
                                  <button
                                    onClick={() => carregarDetalhesCustomizacoes(productId)}
                                    className="ml-4 text-xs text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                                  >
                                    {isLoading ? 'Carregando...' : isExpanded ? '▼ Ocultar detalhes' : '▶ Ver customizações'}
                                  </button>
                                </div>
                              </td>
                              <td className="border p-3 text-right font-semibold">{row.total_customizacoes?.toLocaleString('pt-BR') || 0}</td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={3} className="border p-4 bg-purple-50/50">
                                  {isLoading ? (
                                    <div className="text-center py-4 text-gray-500">Carregando detalhes...</div>
                                  ) : detalhes.length > 0 ? (
                                    <div>
                                      <h4 className="font-semibold mb-3 text-gray-700">Itens mais adicionados a este produto:</h4>
                                      <div className="grid md:grid-cols-2 gap-3">
                                        {detalhes.map((item: any, idx: number) => (
                                          <div key={idx} className="bg-white border rounded-lg p-3 shadow-sm">
                                            <div className="flex justify-between items-start">
                                              <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                  {item.item_name || `Item ${item.item_id}`}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                  Adicionado {item.vezes_adicionado?.toLocaleString('pt-BR') || 0} vezes
                                                </div>
                                                {item.quantidade && (
                                                  <div className="text-xs text-gray-500 mt-1">
                                                    Quantidade total: {item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500">
                                      Nenhum detalhe de customização encontrado
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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

