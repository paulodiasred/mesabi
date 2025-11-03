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

export default function HorarioAnalyticsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [viewBy, setViewBy] = useState<'hour' | 'day'>('hour');
  const [channelFilter, setChannelFilter] = useState<number | null>(null);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    executeQuery();
  }, [viewBy, channelFilter]);

  const fetchChannels = async () => {
    try {
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [{ name: 'count', aggregation: 'count', field: 'id' }],
          dimensions: [{ name: 'Canal', field: 'channel_id' }],
          limit: 10
        }),
      });
      const data = await response.json();
      if (data.data) {
        setChannels(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar canais:', error);
    }
  };

  const executeQuery = async () => {
    setLoading(true);
    try {
      const filters: any[] = [];
      if (channelFilter) {
        filters.push({
          field: 'channel_id',
          op: '=',
          value: channelFilter
        });
      }

      const dimensions = viewBy === 'hour' 
        ? [{ name: 'Hora', field: 'hour_of_day' }]
        : [{ name: 'Dia', field: 'day_of_week' }];

      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'vendas', aggregation: 'count', field: 'id' },
            { name: 'faturamento', aggregation: 'sum', field: 'total_amount' }
          ],
          dimensions,
          filters
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

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}h`;
  };

  const formatDay = (day: number) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[day] || `Dia ${day}`;
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const wasExpanded = false; // No table expansion here
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
    
    pdf.save(`performance-horario-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⏰ Performance por Horário</h1>
        <p className="text-gray-600">
          Analise vendas e faturamento por hora do dia ou dia da semana
        </p>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewBy('hour')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewBy === 'hour'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Por Hora
                </button>
                <button
                  onClick={() => setViewBy('day')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewBy === 'day'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Por Dia da Semana
                </button>
              </div>

              <select
                value={channelFilter || ''}
                onChange={(e) => setChannelFilter(e.target.value ? Number(e.target.value) : null)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Todos os canais</option>
                {channels.map((ch: any) => (
                  <option key={ch.channel_id} value={ch.channel_id}>
                    {ch.channel_name?.replace(/^Canal\s+/i, '') || `Canal ${ch.channel_id}`}
                  </option>
                ))}
              </select>
            </div>

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
                <BarChart data={result.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey={viewBy === 'hour' ? 'hour_of_day' : 'day_of_week'}
                    tickFormatter={viewBy === 'hour' ? formatHour : formatDay}
                    angle={viewBy === 'day' ? -45 : 0}
                    height={viewBy === 'day' ? 80 : 50}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value) => value.toLocaleString('pt-BR')}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'faturamento') {
                        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                      }
                      return value.toLocaleString('pt-BR');
                    }}
                    labelFormatter={(label) => viewBy === 'hour' ? formatHour(label) : formatDay(label)}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="vendas" fill="#9333ea" name="Vendas" />
                  <Bar yAxisId="right" dataKey="faturamento" fill="#8b5cf6" name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>

              <div>
                <h3 className="text-lg font-semibold mb-4">Detalhes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border p-3 text-left font-semibold">
                          {viewBy === 'hour' ? 'Hora' : 'Dia'}
                        </th>
                        <th className="border p-3 text-right font-semibold">Vendas</th>
                        <th className="border p-3 text-right font-semibold">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.map((row: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border p-3 font-medium">
                            {viewBy === 'hour' ? formatHour(row.hour_of_day) : formatDay(row.day_of_week)}
                          </td>
                          <td className="border p-3 text-right">
                            {row.vendas?.toLocaleString('pt-BR') || 0}
                          </td>
                          <td className="border p-3 text-right">
                            R$ {(row.faturamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
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

