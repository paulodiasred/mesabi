'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getHubForPage, getHubName } from '../utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const COLORS = ['#9333ea', '#8b5cf6', '#a78bfa', '#c084fc', '#d946ef', '#e879f9'];

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
    sql: string;
  };
  error?: string;
}

export default function ProdutosAnalyticsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'faturamento', direction: 'desc' });
  const [filters, setFilters] = useState<{ dayOfWeek?: number; hourFrom?: number; hourTo?: number; channelId?: number }>({});
  const [dashboardView, setDashboardView] = useState<'faturamento' | 'quantidade'>('faturamento');
  const [expandedTable, setExpandedTable] = useState(false);
  const [chartItemsToShow, setChartItemsToShow] = useState(10);

  // Load data on mount
  useEffect(() => {
    executeQuery();
  }, []);

  // Execute query
  const executeQuery = async () => {
    setLoading(true);
    try {
      const filterConditions: any[] = [];
      
      if (filters.channelId) {
        filterConditions.push({ field: 'channel_id', op: '=', value: filters.channelId });
      }

      if (filters.dayOfWeek) {
        filterConditions.push({ field: 'day_of_week', op: '=', value: filters.dayOfWeek });
      }

      if (filters.hourFrom) {
        filterConditions.push({ field: 'hour_from', op: '>=', value: filters.hourFrom });
      }
      if (filters.hourTo) {
        filterConditions.push({ field: 'hour_to', op: '<=', value: filters.hourTo });
      }

      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'produtos',
          measures: [
            { name: 'quantidade', aggregation: 'sum', field: 'quantity' },
            { name: 'faturamento', aggregation: 'sum', field: 'total_price' }
          ],
          dimensions: [{ name: 'Produto', field: 'product_id' }],
          filters: filterConditions,
          limit: 20
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  // Handle column sorting
  const handleSort = (columnKey: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    if (sortConfig.key === columnKey && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    
    setSortConfig({ key: columnKey, direction });
  };

  // Get sorted data
  const getSortedData = () => {
    if (!result || !result.data || !sortConfig) {
      return result?.data || [];
    }

    const sorted = [...result.data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return sorted;
  };

  // Check if column is sortable
  const isSortableColumn = (key: string) => {
    return result?.data?.[0] && typeof result.data[0][key] === 'number';
  };

  const hubPath = getHubForPage('/analytics/produtos');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🍔 Produtos Mais Vendidos</h1>
        <p className="text-gray-600">
          Descubra quais produtos vendem mais em cada canal e horário
        </p>
      </div>

      {/* Filters Section */}
      <div className="border rounded-2xl p-6 mb-6 soft-shadow bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
        <h3 className="text-lg font-bold mb-4 text-gray-900">🔍 Filtros</h3>
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Canal</label>
            <select
              className="w-full border-2 border-purple-100 rounded-xl px-3 py-2 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
              value={filters.channelId || ''}
              onChange={(e) => setFilters({ ...filters, channelId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Todos</option>
              <option value="1">Presencial</option>
              <option value="2">iFood</option>
              <option value="3">Rappi</option>
              <option value="4">Uber Eats</option>
              <option value="5">WhatsApp</option>
              <option value="6">App Próprio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Dia da Semana</label>
            <select
              className="w-full border-2 border-purple-100 rounded-xl px-3 py-2 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
              value={filters.dayOfWeek || ''}
              onChange={(e) => setFilters({ ...filters, dayOfWeek: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Todos</option>
              <option value="1">Segunda</option>
              <option value="2">Terça</option>
              <option value="3">Quarta</option>
              <option value="4">Quinta</option>
              <option value="5">Sexta</option>
              <option value="6">Sábado</option>
              <option value="7">Domingo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Horário De</label>
            <input
              type="number"
              min="0"
              max="23"
              className="w-full border-2 border-purple-100 rounded-xl px-3 py-2 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
              placeholder="Ex: 19"
              value={filters.hourFrom || ''}
              onChange={(e) => setFilters({ ...filters, hourFrom: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Horário Até</label>
            <input
              type="number"
              min="0"
              max="23"
              className="w-full border-2 border-purple-100 rounded-xl px-3 py-2 bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all"
              placeholder="Ex: 23"
              value={filters.hourTo || ''}
              onChange={(e) => setFilters({ ...filters, hourTo: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
        <button
          onClick={executeQuery}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 font-medium transition-all shadow-lg hover:shadow-xl"
        >
          {loading ? 'Carregando...' : 'Aplicar Filtros'}
        </button>
      </div>

      {/* Results Section */}
      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Resultados</h2>
            <div className="flex items-center gap-4">
              {result.metadata && (
                <span className="text-sm text-muted-foreground">
                  {result.metadata.totalRows} linhas • {result.metadata.executionTime}ms
                </span>
              )}
              {result.data && result.data.length > 0 && (
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
                    pdf.save(`produtos-mais-vendidos-${new Date().toISOString().split('T')[0]}.pdf`);
                    // Restaurar estado anterior
                    if (!wasExpanded) setExpandedTable(false);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
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
            <>
              {/* Chart */}
              <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Desempenho por Produto</h3>
                  <div className="flex gap-2 bg-white/80 rounded-xl p-1 shadow-sm">
                    <button
                      onClick={() => setDashboardView('faturamento')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        dashboardView === 'faturamento'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      💰 Faturamento
                    </button>
                    <button
                      onClick={() => setDashboardView('quantidade')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        dashboardView === 'quantidade'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      📦 Quantidade
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-end mb-4">
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
                      <option value={getSortedData().length}>Todos ({getSortedData().length})</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-4 px-4">
                  <div style={{ minWidth: `${Math.max(800, chartItemsToShow * 60)}px` }}>
                    <ResponsiveContainer width="100%" height={400}>
                      {dashboardView === 'faturamento' ? (
                        <BarChart data={getSortedData().slice(0, chartItemsToShow).map((item: any, index: number) => ({
                          ...item,
                          chart_label: `#${index + 1}`,
                          product_name_full: item.product_name || `Produto ${item.product_id}`
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="chart_label"
                            tick={{ fontSize: 12 }}
                            interval={0}
                          />
                          <YAxis 
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            labelFormatter={(label: string, payload: any) => {
                              return payload?.[0]?.payload?.product_name_full || label;
                            }}
                            contentStyle={{ borderRadius: '12px', border: '2px solid #e879f9' }}
                          />
                          <Bar dataKey="faturamento" fill="#9333ea" radius={[12, 12, 0, 0]} />
                        </BarChart>
                      ) : (
                        <BarChart data={getSortedData().slice(0, chartItemsToShow).map((item: any, index: number) => ({
                          ...item,
                          chart_label: `#${index + 1}`,
                          product_name_full: item.product_name || `Produto ${item.product_id}`
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="chart_label"
                            tick={{ fontSize: 12 }}
                            interval={0}
                          />
                          <YAxis 
                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toLocaleString('pt-BR')}
                          />
                          <Tooltip 
                            formatter={(value: number) => `${value.toLocaleString('pt-BR')} unidades`}
                            labelFormatter={(label: string, payload: any) => {
                              return payload?.[0]?.payload?.product_name_full || label;
                            }}
                            contentStyle={{ borderRadius: '12px', border: '2px solid #e879f9' }}
                          />
                          <Bar dataKey="quantidade" fill="#c084fc" radius={[12, 12, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
                {chartItemsToShow < getSortedData().length && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Mostrando {chartItemsToShow} de {getSortedData().length} produtos. Use o seletor acima para ver mais ou arraste o gráfico.
                  </p>
                )}
              </div>

              {/* Table */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Tabela Detalhada</h3>
                  {!expandedTable && getSortedData().length > 10 && (
                    <button
                      onClick={() => setExpandedTable(true)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Ver todos ({getSortedData().length})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse rounded-xl overflow-hidden">
                    <thead>
                      <tr className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                        {Object.keys(result.data[0] || {}).map((key) => {
                          const isSortable = isSortableColumn(key);
                          const isSorted = sortConfig.key === key;
                          return (
                            <th 
                              key={key} 
                              className={`text-left p-3 font-bold text-gray-800 ${isSortable ? 'cursor-pointer hover:bg-purple-100 select-none transition-colors' : ''}`}
                              onClick={() => isSortable && handleSort(key)}
                            >
                              <div className="flex items-center gap-2">
                                <span>{key}</span>
                                {isSorted && (
                                  <span className="text-xs">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedData().slice(0, expandedTable ? 1000 : 10).map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-purple-50/50 transition-colors">
                          {Object.values(row).map((cell: any, cellIdx: number) => (
                            <td key={cellIdx} className="p-3 text-gray-700">
                              {typeof cell === 'number' ? cell.toLocaleString('pt-BR') : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {expandedTable && getSortedData().length > 10 && (
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

