'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { subDays } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getHubForPage, getHubName } from '../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
  };
  error?: string;
}

export default function TicketMedioPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [viewBy, setViewBy] = useState<'channel' | 'store'>('channel');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<QueryResult | null>(null);
  const [expandedTable, setExpandedTable] = useState(false);
  const [chartItemsToShow, setChartItemsToShow] = useState(10);

  useEffect(() => {
    executeQuery();
  }, [viewBy, period]);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(now, days);
      const previousStartDate = subDays(startDate, days);

      // Query atual
      const dimension = viewBy === 'channel' ? 'channel_id' : 'store_id';
      const dimensionName = viewBy === 'channel' ? 'Canal' : 'Loja';
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'ticket_medio', aggregation: 'avg', field: 'total_amount' },
            { name: 'total_vendas', aggregation: 'count', field: 'id' }
          ],
          dimensions: [{ name: dimensionName, field: dimension }],
          filters: [
            {
              field: 'created_at',
              op: '>=',
              value: startDate.toISOString().split('T')[0]
            }
          ],
          limit: 50
        }),
      });

      const data = await response.json();

      // Query período anterior
      const comparisonResponse = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'ticket_medio', aggregation: 'avg', field: 'total_amount' },
            { name: 'total_vendas', aggregation: 'count', field: 'id' }
          ],
          dimensions: [{ name: dimensionName, field: dimension }],
          filters: [
            {
              field: 'created_at',
              op: '>=',
              value: previousStartDate.toISOString().split('T')[0]
            },
            {
              field: 'created_at',
              op: '<',
              value: startDate.toISOString().split('T')[0]
            }
          ],
          limit: 50
        }),
      });

      const comparisonData = await comparisonResponse.json();

      // Merge dados para comparar
      const merged = (data.data || []).map((current: any) => {
        const previous = (comparisonData.data || []).find((p: any) => p[dimension] === current[dimension]);
        const diferenca = previous 
          ? ((current.ticket_medio - previous.ticket_medio) / previous.ticket_medio) * 100
          : null;
        
        return {
          ...current,
          ticket_medio_anterior: previous?.ticket_medio || null,
          diferenca,
          label: viewBy === 'channel' 
            ? (current.channel_name || `Canal ${current.channel_id}`).replace(/^Canal\s+/i, '')
            : (current.store_name || `Loja ${current.store_id}`)
        };
      });

      setResult({ ...data, data: merged });
      setComparisonResult(comparisonData);
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  const sortedData = result?.data ? [...result.data].sort((a, b) => {
    if (a.diferenca === null) return 1;
    if (b.diferenca === null) return -1;
    return a.diferenca - b.diferenca; // Ordenar por piora (menor diferença primeiro)
  }) : [];

  const hubPath = getHubForPage('/analytics/ticket-medio');

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Ticket Médio</h1>
        <p className="text-gray-600">
          Compare o ticket médio por canal ou por loja e identifique onde está caindo
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setViewBy('channel')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewBy === 'channel'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Por Canal
          </button>
          <button
            onClick={() => setViewBy('store')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewBy === 'store'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Por Loja
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
                    pdf.save(`ticket-medio-${viewBy}-${period}-${new Date().toISOString().split('T')[0]}.pdf`);
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ticket Médio: Período Atual vs Anterior</h3>
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
                      <option value={sortedData.length}>Todos ({sortedData.length})</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-4 px-4">
                  <div style={{ minWidth: `${Math.max(800, chartItemsToShow * 60)}px` }}>
                    <ResponsiveContainer width="100%" height={500}>
                      <BarChart data={sortedData.slice(0, chartItemsToShow).map((item: any, index: number) => ({
                        ...item,
                        chart_label: `#${index + 1}`,
                        label_full: item.label
                      }))} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="chart_label"
                          tick={{ fontSize: 12 }}
                          interval={0}
                        />
                        <YAxis 
                          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          labelFormatter={(label: string, payload: any) => {
                            return payload?.[0]?.payload?.label_full || label;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="ticket_medio" fill="#9333ea" name="Período Atual" />
                        {comparisonResult && (
                          <Bar dataKey="ticket_medio_anterior" fill="#a78bfa" name="Período Anterior" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {chartItemsToShow < sortedData.length && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Mostrando {chartItemsToShow} de {sortedData.length} {viewBy === 'channel' ? 'canais' : 'lojas'}. Use o seletor acima para ver mais ou arraste o gráfico.
                  </p>
                )}
              </div>

              {/* Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Detalhamento</h3>
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
                        <th className="text-left p-3 font-semibold">{viewBy === 'channel' ? 'Canal' : 'Loja'}</th>
                        <th className="text-right p-3 font-semibold">Ticket Médio Atual</th>
                        <th className="text-right p-3 font-semibold">Ticket Médio Anterior</th>
                        <th className="text-right p-3 font-semibold">Variação</th>
                        <th className="text-right p-3 font-semibold">Total Vendas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.slice(0, expandedTable ? 1000 : 10).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-purple-50/50 transition-colors">
                          <td className="p-3 font-medium">{row.label}</td>
                          <td className="p-3 text-right">
                            R$ {row.ticket_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          </td>
                          <td className="p-3 text-right text-gray-600">
                            {row.ticket_medio_anterior 
                              ? `R$ ${row.ticket_medio_anterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'
                            }
                          </td>
                          <td className={`p-3 text-right font-semibold ${
                            row.diferenca === null 
                              ? 'text-gray-500'
                              : row.diferenca < 0 
                                ? 'text-red-600 bg-red-50'
                                : row.diferenca > 0
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-gray-600'
                          }`}>
                            {row.diferenca === null 
                              ? '-'
                              : `${row.diferenca > 0 ? '+' : ''}${row.diferenca.toFixed(1)}%`
                            }
                          </td>
                          <td className="p-3 text-right text-gray-700">
                            {row.total_vendas?.toLocaleString('pt-BR') || '0'}
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

