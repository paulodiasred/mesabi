'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Bar, BarChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, CartesianGrid } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  avgTicket: number;
  revenueByChannel: Array<{ channel_id: string; total: number }>;
  revenueByDay: Array<{ day: string; current: number; previous: number }>;
  topProducts: Array<{ product_id: string; sales: number; revenue: number }>;
  anomalies?: Array<{ date: string; type: 'spike' | 'drop'; description: string; value: number; change: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Partial<DashboardData>>({});
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [compare, setCompare] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [period, compare]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let fromDate: Date;
      let toDate = now;

      // Calculate period dates
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

      // Fetch current period data
      const currentResponse = await axios.post(`${API_URL}/query/run`, {
        subject: 'vendas',
        measures: [
          { name: 'total', aggregation: 'sum', field: 'total_amount' },
          { name: 'orders', aggregation: 'count', field: 'id' }
        ],
        filters: [
          { field: 'created_at', op: '>=', value: format(fromDate, 'yyyy-MM-dd') },
          { field: 'created_at', op: '<=', value: format(toDate, 'yyyy-MM-dd') }
        ]
      });

      const currentData = currentResponse.data?.data?.[0] || {};
      const totalRevenue = currentData.total || 0;
      const totalOrders = currentData.orders || 0;

      // Fetch by channel
      const channelResponse = await axios.post(`${API_URL}/query/run`, {
        subject: 'vendas',
        measures: [{ name: 'total', aggregation: 'sum', field: 'total_amount' }],
        dimensions: [{ name: 'Canal', field: 'channel_id' }],
        filters: [
          { field: 'created_at', op: '>=', value: format(fromDate, 'yyyy-MM-dd') },
          { field: 'created_at', op: '<=', value: format(toDate, 'yyyy-MM-dd') }
        ],
        limit: 100
      });

      const revenueByChannel = channelResponse.data?.data || [];

      // Fetch daily revenue
      const dailyResponse = await axios.post(`${API_URL}/query/run`, {
        subject: 'vendas',
        measures: [{ name: 'total', aggregation: 'sum', field: 'total_amount' }],
        dimensions: [
          { name: 'Data', field: 'created_at', grouping: 'day' }
        ],
        filters: [
          { field: 'created_at', op: '>=', value: format(fromDate, 'yyyy-MM-dd') },
          { field: 'created_at', op: '<=', value: format(toDate, 'yyyy-MM-dd') }
        ],
        orderBy: { field: 'created_at', direction: 'asc' },
        limit: 100
      });

      const dailyData = dailyResponse.data?.data || [];

      // If compare, fetch previous period
      let previousDaily: any[] = [];
      if (compare) {
        const prevFromDate = subDays(fromDate, period === '7d' ? 7 : period === '30d' ? 30 : 90);
        
        const prevDailyResponse = await axios.post(`${API_URL}/query/run`, {
          subject: 'vendas',
          measures: [{ name: 'total', aggregation: 'sum', field: 'total_amount' }],
          dimensions: [{ name: 'Data', field: 'created_at', grouping: 'day' }],
          filters: [
            { field: 'created_at', op: '>=', value: format(prevFromDate, 'yyyy-MM-dd') },
            { field: 'created_at', op: '<', value: format(fromDate, 'yyyy-MM-dd') }
          ],
          orderBy: { field: 'created_at', direction: 'asc' },
          limit: 100
        });
        
        previousDaily = prevDailyResponse.data?.data || [];
      }

      // Merge daily data with comparison
      const revenueByDay = dailyData.map((item: any, idx: number) => ({
        day: format(new Date(item.created_at_day || item.created_at), 'dd/MM'),
        current: item.total || 0,
        previous: previousDaily[idx]?.total || 0,
        date: item.created_at_day || item.created_at
      }));

      // Detectar anomalias (picos e quedas)
      const anomalies: Array<{ date: string; type: 'spike' | 'drop'; description: string; value: number; change: number }> = [];
      
      if (revenueByDay.length > 0) {
        // Calcular média e desvio padrão
        const values = revenueByDay.map((d: any) => d.current);
        const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const variance = values.reduce((sum: number, val: number) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const threshold = 2 * stdDev; // 2 desvios padrão
        
        revenueByDay.forEach((day: any, idx: number) => {
          const diff = day.current - avg;
          const absDiff = Math.abs(diff);
          
          // Detectar pico (mais de 2 desvios padrão acima da média)
          if (diff > threshold && day.current > 0) {
            const changePercent = ((diff / avg) * 100).toFixed(1);
            anomalies.push({
              date: day.day,
              type: 'spike',
              description: `Pico de ${changePercent}% acima da média`,
              value: day.current,
              change: Number(changePercent)
            });
          }
          
          // Detectar queda (mais de 2 desvios padrão abaixo da média)
          if (diff < -threshold && day.current > 0) {
            const changePercent = ((Math.abs(diff) / avg) * 100).toFixed(1);
            anomalies.push({
              date: day.day,
              type: 'drop',
              description: `Queda de ${changePercent}% abaixo da média`,
              value: day.current,
              change: Number(changePercent)
            });
          }
        });
        
        // Limitar a 5 anomalias mais significativas
        anomalies.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
        anomalies.splice(5);
      }

      setData({
        totalRevenue,
        totalOrders,
        avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        revenueByChannel,
        revenueByDay,
        topProducts: [],
        anomalies: anomalies.length > 0 ? anomalies : undefined
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Executivo</h1>
        <p className="text-muted-foreground">
          Visão geral das operações e performance
        </p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${period === '7d' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setPeriod('7d')}
          >
            7 dias
          </button>
          <button
            className={`px-4 py-2 rounded ${period === '30d' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setPeriod('30d')}
          >
            30 dias
          </button>
          <button
            className={`px-4 py-2 rounded ${period === '90d' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            onClick={() => setPeriod('90d')}
          >
            90 dias
          </button>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
          />
          <span className="text-sm">Comparar com período anterior</span>
        </label>
      </div>

      {/* KPI Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="border rounded-lg p-6">
          <div className="text-sm text-muted-foreground mb-2">Faturamento Total</div>
          <div className="text-3xl font-bold">
            R$ {data.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </div>
        </div>
        <div className="border rounded-lg p-6">
          <div className="text-sm text-muted-foreground mb-2">Total de Pedidos</div>
          <div className="text-3xl font-bold">
            {data.totalOrders?.toLocaleString('pt-BR') || '0'}
          </div>
        </div>
        <div className="border rounded-lg p-6">
          <div className="text-sm text-muted-foreground mb-2">Ticket Médio</div>
          <div className="text-3xl font-bold">
            R$ {data.avgTicket?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Channel */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Faturamento por Canal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.revenueByChannel || []}
                dataKey="total"
                nameKey="channel_id"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `Canal ${entry.channel_id}`}
              >
                {(data.revenueByChannel || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Revenue Trend */}
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Faturamento Diário</h3>
            {compare && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>Período Atual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Período Anterior</span>
                </div>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data.revenueByDay || []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="day" 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb', 
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#0088FE" 
                strokeWidth={3} 
                name="Período Atual"
                dot={{ fill: '#0088FE', r: 4 }}
                activeDot={{ r: 6 }}
              />
              {compare && (
                <Line 
                  type="monotone" 
                  dataKey="previous" 
                  stroke="#8884D8" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  name="Período Anterior"
                  dot={{ fill: '#8884D8', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          
          {/* Anomalias detectadas */}
          {data.anomalies && data.anomalies.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Anomalias Detectadas</div>
              <div className="text-xs text-yellow-700 space-y-1">
                {data.anomalies.slice(0, 3).map((anomaly: any, idx: number) => (
                  <div key={idx}>
                    {anomaly.type === 'spike' ? '📈' : '📉'} {anomaly.date}: {anomaly.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Channel Comparison */}
      <div className="border rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Comparação de Canais</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.revenueByChannel || []}>
            <XAxis dataKey="channel_id" />
            <YAxis />
            <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            <Bar dataKey="total" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <a href="/query-builder" className="border rounded-lg p-4 hover:bg-muted transition">
            <div className="font-semibold mb-2">📊 Query Builder</div>
            <div className="text-sm text-muted-foreground">
              Crie análises personalizadas
            </div>
          </a>
          <a href="/dashboard" className="border rounded-lg p-4 hover:bg-muted transition">
            <div className="font-semibold mb-2">📈 Dashboards</div>
            <div className="text-sm text-muted-foreground">
              Visualize suas métricas
            </div>
          </a>
          <div className="border rounded-lg p-4 bg-muted">
            <div className="font-semibold mb-2">🚧 Em breve</div>
            <div className="text-sm text-muted-foreground">
              Templates prontos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
