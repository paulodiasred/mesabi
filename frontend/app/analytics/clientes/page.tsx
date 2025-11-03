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
            { name: 'ultima_compra', aggregation: 'max', field: 'created_at' }
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
        
        // Calcular dias desde última compra para todos
        const clientsWithDays = clientsWith3Plus.map((c: any) => {
          const daysSince = c.ultima_compra 
            ? Math.floor((new Date().getTime() - new Date(c.ultima_compra).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          return {
            ...c,
            daysSince,
            isInactive: c.ultima_compra ? new Date(c.ultima_compra) < daysAgo : false
          };
        });
        
        // Ordenar por dias desde última compra (mais antigos primeiro)
        clientsWithDays.sort((a: any, b: any) => (b.daysSince || 0) - (a.daysSince || 0));
        
        const inactiveCount = clientsWithDays.filter((c: any) => c.isInactive).length;
        const oldestPurchases = clientsWithDays.slice(0, 10);
        
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
            isInactive: c.isInactive
          }))
        });
        
        // Filtrar clientes
        const filtered = data.data
          .filter((row: any) => {
            if (Number(row.total_compras || 0) < 3) return false;
            
            // Filtrar ultima_compra > X dias atrás
            if (row.ultima_compra) {
              const lastPurchaseDate = new Date(row.ultima_compra);
              const isInactive = lastPurchaseDate < daysAgo;
              return isInactive;
            }
            return false;
          })
          .slice(0, 20);
        
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
                      {Object.keys(result.data[0] || {}).map((key) => {
                        const isSortable = isSortableColumn(key);
                        const isSorted = sortConfig.key === key;
                        return (
                          <th 
                            key={key} 
                            className={`text-left p-3 font-semibold ${isSortable ? 'cursor-pointer hover:bg-muted select-none' : ''}`}
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
                        <td key={cellIdx} className={`p-3 ${key === 'customer_name' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {key === 'ultima_compra' && cell ? 
                            new Date(cell).toLocaleDateString('pt-BR', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            }) :
                            typeof cell === 'number' ? cell.toLocaleString('pt-BR') : 
                            (cell || '-')}
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

