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

export default function DescontosAnalyticsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [totalDescontos, setTotalDescontos] = useState<any>(null);
  const [motivos, setMotivos] = useState<QueryResult | null>(null);
  const [expandedTable, setExpandedTable] = useState(false);

  useEffect(() => {
    executeQueries();
  }, []);

  const executeQueries = async () => {
    setLoading(true);
    try {
      // Total de descontos e valores
      const totalResponse = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'vendas_com_desconto', aggregation: 'count', field: 'id' },
            { name: 'valor_total_descontos', aggregation: 'sum', field: 'total_discount' }
          ],
          dimensions: [],
          filters: [
            {
              field: 'total_discount',
              op: '>',
              value: 0
            }
          ]
        }),
      });
      const totalData = await totalResponse.json();
      setTotalDescontos(totalData.data?.[0] || null);

      // Descontos por motivo
      const motivosResponse = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'vendas_com_desconto', aggregation: 'count', field: 'id' },
            { name: 'valor_total_descontos', aggregation: 'sum', field: 'total_discount' }
          ],
          dimensions: [{ name: 'Motivo', field: 'discount_reason' }],
          filters: [
            {
              field: 'total_discount',
              op: '>',
              value: 0
            },
            {
              field: 'discount_reason',
              op: '!=',
              value: null
            }
          ],
          orderBy: {
            field: 'valor_total_descontos',
            direction: 'desc'
          },
          limit: 20
        }),
      });
      
      const motivosData = await motivosResponse.json();
      setMotivos(motivosData);
      setResult({ data: [], metadata: totalData.metadata });
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
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
    
    pdf.save(`analise-descontos-${new Date().toISOString().split('T')[0]}.pdf`);
    
    if (!wasExpanded) setExpandedTable(false);
  };

  const hubPath = getHubForPage('/analytics/descontos');

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎁 Análise de Descontos</h1>
        <p className="text-gray-600">
          Monitore descontos aplicados e identifique padrões
        </p>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Resumo de Descontos</h2>
            <div className="flex items-center gap-4">
              {result.metadata && (
                <span className="text-sm text-muted-foreground">
                  {result.metadata.totalRows} linhas • {result.metadata.executionTime}ms
                </span>
              )}
              {totalDescontos && (
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
          ) : totalDescontos ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded-xl p-6 bg-gradient-to-br from-purple-50 to-purple-100">
                  <div className="text-sm text-purple-700 font-medium mb-2">Vendas com Desconto</div>
                  <div className="text-3xl font-bold text-purple-900">
                    {totalDescontos.vendas_com_desconto?.toLocaleString('pt-BR') || 0}
                  </div>
                </div>
                <div className="border rounded-xl p-6 bg-gradient-to-br from-orange-50 to-orange-100">
                  <div className="text-sm text-orange-700 font-medium mb-2">Valor Total Descontado</div>
                  <div className="text-3xl font-bold text-orange-900">
                    R$ {(totalDescontos.valor_total_descontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {motivos && motivos.data && motivos.data.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Descontos por Motivo</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={motivos.data.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="discount_reason"
                        angle={-45}
                        textAnchor="end"
                        height={150}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis yAxisId="left" tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'valor_total_descontos') {
                            return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                          }
                          return value.toLocaleString('pt-BR');
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="vendas_com_desconto" fill="#9333ea" name="Vendas" />
                      <Bar yAxisId="right" dataKey="valor_total_descontos" fill="#8b5cf6" name="Valor Descontado" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Detalhes por Motivo</h3>
                      {motivos.data.length > 10 && (
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
                            <th className="border p-3 text-left font-semibold">Motivo</th>
                            <th className="border p-3 text-right font-semibold">Vendas</th>
                            <th className="border p-3 text-right font-semibold">Valor Descontado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(expandedTable ? motivos.data : motivos.data.slice(0, 10)).map((row: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border p-3 font-medium">{row.discount_reason || 'Sem motivo'}</td>
                              <td className="border p-3 text-right">{row.vendas_com_desconto?.toLocaleString('pt-BR') || 0}</td>
                              <td className="border p-3 text-right">
                                R$ {(row.valor_total_descontos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
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

