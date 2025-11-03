'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const COLORS = ['#9333ea', '#8b5cf6', '#a78bfa', '#c084fc', '#d946ef', '#e879f9'];

// Helper function to remove "Canal " prefix from channel names
const formatChannelName = (channelName: string | null | undefined, channelId: number | null | undefined): string => {
  if (channelName) {
    // Remove "Canal " prefix if it exists
    return channelName.replace(/^Canal\s+/i, '').trim();
  }
  // Fallback: if no name, return generic text
  return channelId ? `Canal ${channelId}` : 'Sem nome';
};

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
    sql: string;
  };
  error?: string;
}

export default function CanaisAnalyticsPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    executeQuery();
  }, []);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [{ name: 'faturamento', aggregation: 'sum', field: 'total_amount' }],
          dimensions: [{ name: 'Canal', field: 'channel_id' }],
          limit: 10
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Faturamento por Canal</h1>
        <p className="text-gray-600">
          Visualize quanto cada canal está faturando
        </p>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Faturamento por Canal</h2>
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
                    pdf.save(`faturamento-canais-${new Date().toISOString().split('T')[0]}.pdf`);
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
            (() => {
              // Process data to format channel names (remove "Canal " prefix)
              // Group by channel name to handle duplicate channels with same name but different IDs
              const dataMap = new Map<string, any>();
              
              result.data.forEach((entry: any) => {
                const channelNameFormatted = formatChannelName(entry.channel_name, entry.channel_id);
                
                if (dataMap.has(channelNameFormatted)) {
                  // Sum faturamento if duplicate channel name found
                  dataMap.get(channelNameFormatted).faturamento += entry.faturamento || 0;
                } else {
                  dataMap.set(channelNameFormatted, {
                    ...entry,
                    channel_name_formatted: channelNameFormatted
                  });
                }
              });
              
              const processedData = Array.from(dataMap.values());
              const totalFaturamento = processedData.reduce((acc: number, curr: any) => acc + curr.faturamento, 0);
              
              return (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Distribuição</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={processedData}
                          dataKey="faturamento"
                          nameKey="channel_name_formatted"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          label={(entry: any) => {
                            const percentage = ((entry.faturamento / totalFaturamento) * 100).toFixed(1);
                            return `${entry.channel_name_formatted}: ${percentage}%`;
                          }}
                        >
                          {processedData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Valores</h3>
                    <div className="space-y-3">
                      {processedData.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{entry.channel_name_formatted}</span>
                          </div>
                          <span className="font-semibold">
                            R$ {entry.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
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

