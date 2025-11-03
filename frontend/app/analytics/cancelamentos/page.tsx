'use client';

import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const COLORS = ['#ef4444', '#22c55e'];

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
    sql: string;
  };
  error?: string;
}

export default function CancelamentosAnalyticsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [motivos, setMotivos] = useState<QueryResult | null>(null);

  useEffect(() => {
    executeQueries();
  }, []);

  const executeQueries = async () => {
    setLoading(true);
    try {
      // Taxa de cancelamento geral
      const statusResponse = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [{ name: 'count', aggregation: 'count', field: 'id' }],
          dimensions: [{ name: 'Status', field: 'sale_status_desc' }],
        }),
      });
      const statusData = await statusResponse.json();
      setResult(statusData);

      // Como não temos campo específico de motivo de cancelamento,
      // vamos usar discount_reason como proxy (quando status = CANCELLED)
      // Na verdade, vamos apenas mostrar a distribuição de status
      
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
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
    
    pdf.save(`cancelamentos-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalVendas = result?.data?.reduce((acc: number, curr: any) => acc + (curr.count || 0), 0) || 0;
  const canceladas = result?.data?.find((r: any) => r.sale_status_desc === 'CANCELLED')?.count || 0;
  const completadas = result?.data?.find((r: any) => r.sale_status_desc === 'COMPLETED')?.count || 0;
  const taxaCancelamento = totalVendas > 0 ? ((canceladas / totalVendas) * 100).toFixed(2) : '0.00';

  const chartData = [
    { name: 'Completadas', value: completadas, color: '#22c55e' },
    { name: 'Canceladas', value: canceladas, color: '#ef4444' }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">❌ Taxa de Cancelamento</h1>
        <p className="text-gray-600">
          Monitore a taxa de cancelamento e identifique padrões
        </p>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Análise de Cancelamentos</h2>
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
              {/* Taxa de Cancelamento */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="border rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100">
                  <div className="text-sm text-green-700 font-medium mb-2">✅ Vendas Completadas</div>
                  <div className="text-3xl font-bold text-green-900">{completadas.toLocaleString('pt-BR')}</div>
                  <div className="text-sm text-green-700 mt-1">
                    {totalVendas > 0 ? ((completadas / totalVendas) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div className="border rounded-xl p-6 bg-gradient-to-br from-red-50 to-red-100">
                  <div className="text-sm text-red-700 font-medium mb-2">❌ Vendas Canceladas</div>
                  <div className="text-3xl font-bold text-red-900">{canceladas.toLocaleString('pt-BR')}</div>
                  <div className="text-sm text-red-700 mt-1">
                    {taxaCancelamento}%
                  </div>
                </div>
                <div className="border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="text-sm text-blue-700 font-medium mb-2">📊 Total de Vendas</div>
                  <div className="text-3xl font-bold text-blue-900">{totalVendas.toLocaleString('pt-BR')}</div>
                </div>
              </div>

              {/* Gráfico de Pizza */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Distribuição</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.name}: ${entry.value.toLocaleString('pt-BR')} (${((entry.value / totalVendas) * 100).toFixed(1)}%)`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Detalhes por Status</h3>
                  <div className="space-y-3">
                    {result.data.map((row: any, index: number) => {
                      const percentage = totalVendas > 0 ? ((row.count / totalVendas) * 100).toFixed(2) : '0.00';
                      const isCancelled = row.sale_status_desc === 'CANCELLED';
                      return (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg ${
                            isCancelled ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`font-medium ${isCancelled ? 'text-red-900' : 'text-green-900'}`}>
                              {row.sale_status_desc === 'CANCELLED' ? '❌ Canceladas' : '✅ Completadas'}
                            </span>
                            <span className={`font-bold ${isCancelled ? 'text-red-900' : 'text-green-900'}`}>
                              {row.count.toLocaleString('pt-BR')} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

