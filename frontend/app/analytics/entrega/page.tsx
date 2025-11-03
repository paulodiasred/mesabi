'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function EntregaAnalyticsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'diferenca', direction: 'desc' });
  const [viewBy, setViewBy] = useState<'store' | 'city' | 'state' | 'neighborhood'>('city');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [compare, setCompare] = useState(true);
  const [expandedTable, setExpandedTable] = useState(false);

  useEffect(() => {
    executeQuery();
  }, [viewBy, period, compare]);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const deliveryChannels = [2, 3, 4, 5, 6];
      
      // Calculate date ranges
      const now = new Date();
      let fromDate: Date;
      
      switch (period) {
        case '7d':
          fromDate = subDays(now, 7);
          break;
        case '30d':
          fromDate = subDays(now, 30);
          break;
        case '90d':
          fromDate = subDays(now, 90);
          break;
      }
      
      let dimensions: any[];
      if (viewBy === 'store') {
        dimensions = [{ name: 'Loja', field: 'store_id' }];
      } else if (viewBy === 'city') {
        dimensions = [{ name: 'Cidade', field: 'city' }];
      } else if (viewBy === 'state') {
        dimensions = [{ name: 'Estado', field: 'state' }];
      } else {
        dimensions = [{ name: 'Bairro', field: 'neighborhood' }];
      }
      
      // Fetch current period
      const currentResponse = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'tempo_medio_atual', aggregation: 'avg', field: 'delivery_seconds' }
          ],
          dimensions,
          filters: [
            { field: 'channel_id', op: 'in', value: deliveryChannels },
            { field: 'created_at', op: '>=', value: format(fromDate, 'yyyy-MM-dd') }
          ],
          limit: 20
        }),
      });

      const currentData = await currentResponse.json();
      
      let previousData = { data: [] };
      
      // Fetch previous period if comparing
      if (compare) {
        const prevFromDate = subDays(fromDate, period === '7d' ? 7 : period === '30d' ? 30 : 90);
        
        const prevResponse = await fetch(`${API_URL}/query/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'vendas',
            measures: [
              { name: 'tempo_medio_anterior', aggregation: 'avg', field: 'delivery_seconds' }
            ],
            dimensions,
            filters: [
              { field: 'channel_id', op: 'in', value: deliveryChannels },
              { field: 'created_at', op: '>=', value: format(prevFromDate, 'yyyy-MM-dd') },
              { field: 'created_at', op: '<', value: format(fromDate, 'yyyy-MM-dd') }
            ],
            limit: 20
          }),
        });
        
        previousData = await prevResponse.json();
      }
      
      // Merge current and previous data
      if (currentData.data && Array.isArray(currentData.data)) {
        const mergedData = currentData.data.map((row: any): any => {
          const processed: any = {
            ...row,
            tempo_medio_atual: row.tempo_medio_atual && typeof row.tempo_medio_atual === 'number' && !isNaN(row.tempo_medio_atual) 
              ? Number((row.tempo_medio_atual / 60).toFixed(1))
              : 0
          };
          
          // Find matching previous period data
          if (compare && previousData.data) {
            const match: any = previousData.data.find((prev: any) => {
              if (viewBy === 'store') return prev.store_id === row.store_id;
              if (viewBy === 'city') return prev.city === row.city;
              if (viewBy === 'state') return prev.state === row.state;
              return false;
            });
            
            if (match) {
              processed.tempo_medio_anterior = match.tempo_medio_anterior && typeof match.tempo_medio_anterior === 'number' && !isNaN(match.tempo_medio_anterior)
                ? Number((match.tempo_medio_anterior / 60).toFixed(1))
                : 0;
              
              // Calculate difference
              processed.diferenca = processed.tempo_medio_atual - processed.tempo_medio_anterior;
            } else {
              processed.tempo_medio_anterior = 0;
              processed.diferenca = processed.tempo_medio_atual;
            }
          }
          
          return processed;
        });
        
        currentData.data = mergedData;
      }
      
      setResult(currentData);
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (columnKey: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key: columnKey, direction });
  };

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
      return 0;
    });

    return sorted;
  };

  const isSortableColumn = (key: string) => {
    return result?.data?.[0] && typeof result.data[0][key] === 'number';
  };

  const formatStoreName = (name: string): string => {
    // Encurtar nomes longos mantendo o essencial
    if (name.length > 30) {
      // Pegar as primeiras palavras até 30 caracteres
      return name.substring(0, 30) + '...';
    }
    return name;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🚚 Tempo de Entrega</h1>
        <p className="text-gray-600">
          Compare tempos de entrega entre períodos e regiões
        </p>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Tempo Médio</h2>
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
                    pdf.save(`tempo-entrega-${viewBy}-${period}-${new Date().toISOString().split('T')[0]}.pdf`);
                    // Restaurar estado anterior
                    if (!wasExpanded) setExpandedTable(false);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  📄 Gerar PDF
                </button>
              )}
            </div>
          </div>
          
          {/* Period and Compare Toggle */}
          <div className="flex gap-2 mb-6">
            <div className="flex gap-2 bg-white/80 rounded-xl p-1 shadow-sm flex-1">
              <button
                onClick={() => setPeriod('7d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex-1 ${
                  period === '7d'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 7 dias
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex-1 ${
                  period === '30d'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 30 dias
              </button>
              <button
                onClick={() => setPeriod('90d')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex-1 ${
                  period === '90d'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 90 dias
              </button>
            </div>
            <button
              onClick={() => setCompare(!compare)}
              className={`px-6 py-2 rounded-xl font-medium transition-all shadow-sm ${
                compare
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {compare ? '📊 Comparando' : '🔍 Ver Comparação'}
            </button>
          </div>
          
          {/* View Toggle */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <button
              onClick={() => setViewBy('state')}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                viewBy === 'state'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                  : 'bg-white/80 text-gray-600 hover:text-gray-900'
              }`}
            >
              🗺️ Por Estado
            </button>
            <button
              onClick={() => setViewBy('city')}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                viewBy === 'city'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                  : 'bg-white/80 text-gray-600 hover:text-gray-900'
              }`}
            >
              🌆 Por Cidade
            </button>
            <button
              onClick={() => setViewBy('neighborhood')}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                viewBy === 'neighborhood'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                  : 'bg-white/80 text-gray-600 hover:text-gray-900'
              }`}
            >
              🏘️ Por Bairro
            </button>
            <button
              onClick={() => setViewBy('store')}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                viewBy === 'store'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                  : 'bg-white/80 text-gray-600 hover:text-gray-900'
              }`}
            >
              🏪 Por Loja
            </button>
          </div>

          {result.error ? (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
              {result.error}
            </div>
          ) : result.data && result.data.length > 0 ? (
            <>
              <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Gráfico - Tempo de Entrega</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getSortedData().slice(0, 15)}>
                    <XAxis 
                      dataKey={
                        viewBy === 'store' ? 'store_name' : 
                        viewBy === 'city' ? 'city' :
                        viewBy === 'neighborhood' ? 'neighborhood' :
                        'state'
                      }
                      angle={viewBy === 'store' || viewBy === 'city' || viewBy === 'neighborhood' ? -90 : 0} 
                      textAnchor={viewBy === 'store' || viewBy === 'city' || viewBy === 'neighborhood' ? 'end' : 'middle'} 
                      height={viewBy === 'store' || viewBy === 'city' || viewBy === 'neighborhood' ? 180 : 50}
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                      tickFormatter={viewBy === 'store' ? formatStoreName : undefined}
                    />
                    <YAxis 
                      label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      formatter={(value: number) => `${value} min`}
                      contentStyle={{ borderRadius: '12px', border: '2px solid #fb923c' }}
                    />
                    <Legend />
                    {compare ? (
                      <>
                        <Bar dataKey="tempo_medio_atual" fill="#f97316" radius={[12, 12, 0, 0]} name="Atual" />
                        <Bar dataKey="tempo_medio_anterior" fill="#94a3b8" radius={[12, 12, 0, 0]} name="Anterior" />
                      </>
                    ) : (
                      <Bar dataKey="tempo_medio_atual" fill="#f97316" radius={[12, 12, 0, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Tabela Detalhada</h3>
                  {!expandedTable && getSortedData().length > 10 && (
                    <button
                      onClick={() => setExpandedTable(true)}
                      className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Ver todos ({getSortedData().length})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse rounded-xl overflow-hidden">
                    <thead>
                      <tr className="border-b bg-gradient-to-r from-orange-50 to-pink-50">
                        {Object.keys(result.data[0] || {}).map((key) => {
                          const isSortable = isSortableColumn(key);
                          const isSorted = sortConfig.key === key;
                          return (
                            <th 
                              key={key} 
                              className={`text-left p-3 font-bold text-gray-800 ${isSortable ? 'cursor-pointer hover:bg-orange-100 select-none transition-colors' : ''}`}
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
                        <tr key={idx} className="border-b hover:bg-orange-50/50 transition-colors">
                          {Object.entries(row).map(([key, cell]: [string, any], cellIdx: number) => (
                            <td key={cellIdx} className={`p-3 ${key === 'diferenca' && cell > 0 ? 'bg-red-50 font-bold text-red-600' : key === 'diferenca' && cell < 0 ? 'bg-green-50 font-bold text-green-600' : 'text-gray-700'}`}>
                              {key === 'tempo_medio_atual' && typeof cell === 'number' ? `${cell} min` :
                               key === 'tempo_medio_anterior' && typeof cell === 'number' ? `${cell} min` :
                               key === 'diferenca' && typeof cell === 'number' ? `${cell > 0 ? '+' : ''}${cell} min` :
                               key === 'store_name' ? formatStoreName(String(cell)) :
                               typeof cell === 'number' ? cell.toLocaleString('pt-BR') : String(cell)}
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
                    className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
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

