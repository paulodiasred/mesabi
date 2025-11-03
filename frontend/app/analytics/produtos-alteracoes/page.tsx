'use client';

import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
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

export default function ProdutosAlteracoesAnalyticsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [expandedTable, setExpandedTable] = useState(false);

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
          limit: 20
        }),
      });

      const data = await response.json();
      console.log('Produtos alterações query response:', data);
      
      // Precisamos fazer uma segunda query para pegar os nomes dos produtos
      // pois o subject 'items' não tem acesso direto aos nomes dos produtos
      // Vamos ajustar isso
      
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
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
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={result.data.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="product_name"
                    angle={-45}
                    textAnchor="end"
                    height={150}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickFormatter={(value) => value.toLocaleString('pt-BR')} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_customizacoes" fill="#9333ea" name="Total de Customizações" />
                </BarChart>
              </ResponsiveContainer>

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
                        <th className="border p-3 text-left font-semibold">Produto</th>
                        <th className="border p-3 text-right font-semibold">Total de Customizações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(expandedTable ? result.data : result.data.slice(0, 10)).map((row: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border p-3 font-medium">{row.product_name || `Produto ${row.product_id}`}</td>
                          <td className="border p-3 text-right">{row.total_customizacoes?.toLocaleString('pt-BR') || 0}</td>
                        </tr>
                      ))}
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

