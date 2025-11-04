'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { subDays } from 'date-fns';
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
  filteredCount?: number;
  totalWith3Plus?: number;
  daysAgoThreshold?: string;
}

export default function ClientesAnalyticsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'total_compras', direction: 'desc' });
  const [inactiveDays, setInactiveDays] = useState<number>(30);
  const [expandedTable, setExpandedTable] = useState(false);

  useEffect(() => {
    executeQuery();
  }, [inactiveDays]);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'total_compras', aggregation: 'count', field: 'id' },
            { name: 'ultima_compra', aggregation: 'max', field: 'created_at' },
            { name: 'lifetime_value', aggregation: 'sum', field: 'total_amount' },
            { name: 'primeira_compra', aggregation: 'min', field: 'created_at' }
          ],
          dimensions: [{ name: 'Cliente', field: 'customer_id' }],
          filters: [],
          limit: 1000
        }),
      });

      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        const daysAgo = subDays(new Date(), inactiveDays);
        
        // Contar total de clientes com 3+ compras ANTES do filtro
        const totalWith3Plus = data.data.filter((row: any) => Number(row.total_compras || 0) >= 3).length;
        
        // Debug: verificar distribuição de datas
        const clientsWith3Plus = data.data.filter((row: any) => Number(row.total_compras || 0) >= 3);
        
        // Calcular dias desde última compra e métricas de Lifetime Value para todos
        const clientsWithDays = clientsWith3Plus.map((c: any) => {
          const daysSince = c.ultima_compra 
            ? Math.floor((new Date().getTime() - new Date(c.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          // Calcular dias desde primeira compra
          const daysSinceFirst = c.primeira_compra
            ? Math.floor((new Date().getTime() - new Date(c.primeira_compra).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          // Calcular ticket médio
          const ltv = Number(c.lifetime_value || 0);
          const totalCompras = Number(c.total_compras || 0);
          const avgTicket = totalCompras > 0 && ltv > 0
            ? ltv / totalCompras
            : 0;
          
          // Calcular frequência de compra (compras por mês)
          const monthsActive = daysSinceFirst ? Math.max(1, daysSinceFirst / 30) : 1;
          const frequencyPerMonth = c.total_compras > 0 ? Number(c.total_compras) / monthsActive : 0;
          
          return {
            ...c,
            daysSince,
            daysSinceFirst,
            lifetime_value: Number(c.lifetime_value || 0),
            avgTicket,
            frequencyPerMonth,
            monthsActive,
            isInactive: c.ultima_compra ? new Date(c.ultima_compra) < daysAgo : false
          };
        });
        
        // Filtrar clientes inativos (depois de calcular todos os campos)
        const filtered = clientsWithDays
          .filter((c: any) => c.isInactive)
          .slice(0, 100); // Aumentar limite para mostrar mais clientes
        
        // Ordenar por dias desde última compra (mais antigos primeiro)
        filtered.sort((a: any, b: any) => (b.daysSince || 0) - (a.daysSince || 0));
        
        const inactiveCount = filtered.length;
        const oldestPurchases = filtered.slice(0, 10);
        
        console.log(`[Clientes] Período: ${inactiveDays} dias`, {
          totalComClientes: data.data.length,
          totalCom3Plus: totalWith3Plus,
          thresholdDate: daysAgo.toISOString().split('T')[0],
          inactiveCount,
          oldestPurchases: oldestPurchases.map((c: any) => ({
            id: c.customer_id,
            name: c.customer_name,
            total: c.total_compras,
            last: c.ultima_compra ? new Date(c.ultima_compra).toISOString().split('T')[0] : null,
            daysSince: c.daysSince,
            isInactive: c.isInactive,
            ltv: c.lifetime_value,
            avgTicket: c.avgTicket,
            frequency: c.frequencyPerMonth
          }))
        });
        
        data.data = filtered;
        data.filteredCount = filtered.length;
        data.totalWith3Plus = totalWith3Plus;
        data.daysAgoThreshold = daysAgo.toISOString();
      }
      
      setResult(data);
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
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle date strings
      if (sortConfig.key === 'ultima_compra' || sortConfig.key === 'primeira_compra') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      // Handle string comparisons
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      
      // Handle number comparisons
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Fallback: convert to number if possible
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return sorted;
  };

  const isSortableColumn = (key: string) => {
    return result?.data?.[0] && typeof result.data[0][key] === 'number';
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">👥 Clientes para Recompra</h1>
        <p className="text-gray-600">
          Identifique clientes que compraram várias vezes mas sumiram
        </p>
      </div>

      {/* Filtros de Período */}
      <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-gray-700">Inatividade:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setInactiveDays(30)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                inactiveDays === 30
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              30 dias
            </button>
            <button
              onClick={() => setInactiveDays(60)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                inactiveDays === 60
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              60 dias
            </button>
            <button
              onClick={() => setInactiveDays(90)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                inactiveDays === 90
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              90 dias
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Clientes com 3+ Compras</h2>
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
                    pdf.save(`clientes-inativos-${inactiveDays}dias-${new Date().toISOString().split('T')[0]}.pdf`);
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

          {result.error ? (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
              {result.error}
            </div>
          ) : result.data && result.data.length > 0 ? (
            <>
              {/* Cards com métricas agregadas */}
              {result.data.length > 0 && (
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="text-sm text-purple-700 font-medium mb-1">LTV Total</div>
                    <div className="text-2xl font-bold text-purple-900">
                      R$ {getSortedData().reduce((sum: number, c: any) => sum + (c.lifetime_value || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="text-sm text-blue-700 font-medium mb-1">LTV Médio</div>
                    <div className="text-2xl font-bold text-blue-900">
                      R$ {(getSortedData().reduce((sum: number, c: any) => sum + (c.lifetime_value || 0), 0) / getSortedData().length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="text-sm text-green-700 font-medium mb-1">Ticket Médio</div>
                    <div className="text-2xl font-bold text-green-900">
                      R$ {(getSortedData().reduce((sum: number, c: any) => sum + (c.avgTicket || 0), 0) / getSortedData().length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="text-sm text-orange-700 font-medium mb-1">Freq. Média</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {(getSortedData().reduce((sum: number, c: any) => sum + (c.frequencyPerMonth || 0), 0) / getSortedData().length).toFixed(1)}/mês
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Clientes Inativos</h3>
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
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th 
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('customer_name')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Cliente</span>
                          {sortConfig.key === 'customer_name' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('total_compras')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Total Compras</span>
                          {sortConfig.key === 'total_compras' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('lifetime_value')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Lifetime Value</span>
                          {sortConfig.key === 'lifetime_value' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('avgTicket')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Ticket Médio</span>
                          {sortConfig.key === 'avgTicket' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('frequencyPerMonth')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Freq. por Mês</span>
                          {sortConfig.key === 'frequencyPerMonth' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('ultima_compra')}
                      >
                        <div className="flex items-center gap-2">
                          <span>Última Compra</span>
                          {sortConfig.key === 'ultima_compra' && (
                            <span className="text-xs">
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold cursor-pointer hover:bg-muted select-none"
                        onClick={() => handleSort('daysSince')}
                          >
                            <div className="flex items-center gap-2">
                          <span>Dias Inativo</span>
                          {sortConfig.key === 'daysSince' && (
                                <span className="text-xs">
                                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData().slice(0, expandedTable ? 1000 : 10).map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-orange-50/50 transition-colors">
                      <td className="p-3 font-semibold text-gray-900">{row.customer_name || `Cliente ${row.customer_id}`}</td>
                      <td className="p-3 text-gray-700 text-right">{row.total_compras?.toLocaleString('pt-BR') || 0}</td>
                      <td className="p-3 text-gray-700 text-right font-semibold text-green-700">
                        R$ {(row.lifetime_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-gray-700 text-right">
                        R$ {(row.avgTicket || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-gray-700 text-right">
                        {(row.frequencyPerMonth || 0).toFixed(1)}/mês
                      </td>
                      <td className="p-3 text-gray-700">
                        {row.ultima_compra ? 
                          new Date(row.ultima_compra).toLocaleDateString('pt-BR', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                          }) : '-'}
                      </td>
                      <td className="p-3 text-gray-700 text-right">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          (row.daysSince || 0) >= 90 ? 'bg-red-100 text-red-700' :
                          (row.daysSince || 0) >= 60 ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {row.daysSince || 0} dias
                        </span>
                        </td>
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
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum cliente encontrado
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Nenhum cliente com 3+ compras está inativo há mais de {inactiveDays} dias
              </div>
              {result.totalWith3Plus !== undefined && (
                <div className="text-xs text-gray-500">
                  Total de clientes com 3+ compras: {result.totalWith3Plus}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

