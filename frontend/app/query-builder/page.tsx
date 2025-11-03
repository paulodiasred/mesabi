'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
    sql: string;
  };
  error?: string;
}

export default function QueryBuilderPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<'product' | 'delivery' | 'clients' | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<{ dayOfWeek?: number; hourFrom?: number; hourTo?: number; channelId?: number }>({});

  // Template 1: Qual produto vende mais na quinta à noite no iFood?
  const executeTemplate1 = async () => {
    setActiveTemplate('product');
    setLoading(true);
    setSortConfig({ key: 'faturamento', direction: 'desc' });
    try {
      // Usar product_sales para ver produtos mais vendidos
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

  // Apply filters and re-execute
  const applyFiltersToProducts = async () => {
    setLoading(true);
    setSortConfig({ key: 'faturamento', direction: 'desc' });
    try {
      // Build filter conditions
      const filterConditions: any[] = [];
      
      // Add channel filter
      if (filters.channelId) {
        filterConditions.push({ field: 'channel_id', op: '=', value: filters.channelId });
      }

      // Add day of week filter (1=Monday, 7=Sunday)
      if (filters.dayOfWeek) {
        filterConditions.push({ field: 'day_of_week', op: '=', value: filters.dayOfWeek });
      }

      // Add hour range filters
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

  // Template 2: Meu tempo de entrega piorou. Em quais regiões?
  const executeTemplate2 = async () => {
    setActiveTemplate('delivery');
    setLoading(true);
    setSortConfig({ key: 'tempo_medio', direction: 'desc' });
    try {
      // Filter for delivery channels only (2=iFood, 3=Rappi, 4=Uber Eats, 5=WhatsApp, 6=App Próprio)
      const deliveryChannels = [2, 3, 4, 5, 6];
      
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'tempo_medio', aggregation: 'avg', field: 'delivery_seconds' }
          ],
          dimensions: [{ name: 'Loja', field: 'store_id' }],
          filters: [
            { field: 'channel_id', op: 'in', value: deliveryChannels }
          ],
          limit: 20
        }),
      });

      const data = await response.json();
      
      // Convert seconds to minutes and format
      if (data.data && Array.isArray(data.data)) {
        data.data = data.data.map((row: any) => ({
          ...row,
          tempo_medio: row.tempo_medio && typeof row.tempo_medio === 'number' && !isNaN(row.tempo_medio) 
            ? (row.tempo_medio / 60).toFixed(1) 
            : '0'
        }));
      }
      
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  // Template 3: Quais clientes compraram 3+ mas não voltam há 30 dias?
  const executeTemplate3 = async () => {
    setActiveTemplate('clients');
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'vendas',
          measures: [
            { name: 'total_compras', aggregation: 'count', field: 'id' }
          ],
          dimensions: [{ name: 'Cliente', field: 'customer_id' }],
          filters: [],
          limit: 1000
        }),
      });

      const data = await response.json();
      
      // Filtrar clientes com 3+ compras (fazer no cliente por enquanto)
      if (data.data && Array.isArray(data.data)) {
        data.data = data.data
          .filter((row: any) => Number(row.total_compras || 0) >= 3)
          .slice(0, 20);
      }
      
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  // Template genérico - Faturamento por Canal
  const executeGenericChannel = async () => {
    setActiveTemplate(null);
    setLoading(true);
    setSortConfig(null);
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

  // Handle column sorting
  const handleSort = (columnKey: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    if (sortConfig && sortConfig.key === columnKey && sortConfig.direction === 'desc') {
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

      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle string values
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });

    return sorted;
  };

  // Check if column is sortable
  const isSortableColumn = (key: string) => {
    // Make numeric columns sortable
    return result?.data?.[0] && typeof result.data[0][key] === 'number';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Query Builder</h1>
        <p className="text-muted-foreground">
          Análises prontas para responder as perguntas da sua operação
        </p>
      </div>

      {/* Templates Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Template 1 */}
        <div className="border rounded-lg p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-3">🍔</div>
          <h3 className="text-lg font-semibold mb-2">Produtos Mais Vendidos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Descubra quais produtos vendem mais em cada canal e horário
          </p>
          <button
            onClick={executeTemplate1}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && activeTemplate === 'product' ? 'Carregando...' : 'Ver Análise'}
          </button>
        </div>

        {/* Template 2 */}
        <div className="border rounded-lg p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-3">🚚</div>
          <h3 className="text-lg font-semibold mb-2">Tempo de Entrega</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Compare tempos de entrega entre períodos e regiões
          </p>
          <button
            onClick={executeTemplate2}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && activeTemplate === 'delivery' ? 'Carregando...' : 'Ver Análise'}
          </button>
        </div>

        {/* Template 3 */}
        <div className="border rounded-lg p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="text-lg font-semibold mb-2">Clientes para Recompra</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Identifique clientes que compraram várias vezes mas sumiram
          </p>
          <button
            onClick={executeTemplate3}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && activeTemplate === 'clients' ? 'Carregando...' : 'Ver Análise'}
          </button>
        </div>

        {/* Quick Analytics */}
        <div className="border rounded-lg p-6 hover:shadow-lg transition">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-lg font-semibold mb-2">Faturamento por Canal</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Visualize quanto cada canal está faturando
          </p>
          <button
            onClick={executeGenericChannel}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {loading && activeTemplate === null ? 'Carregando...' : 'Ver Análise'}
          </button>
        </div>

        <div className="border rounded-lg p-6 bg-muted">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold mb-2">Horários de Pico</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Em breve: análise de vendas por horário
          </p>
          <div className="w-full bg-muted px-4 py-2 rounded-md text-center text-sm">
            Em breve
          </div>
        </div>

        <div className="border rounded-lg p-6 bg-muted">
          <div className="text-4xl mb-3">📱</div>
          <h3 className="text-lg font-semibold mb-2">Comparar Períodos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Em breve: compare mês atual com anterior
          </p>
          <div className="w-full bg-muted px-4 py-2 rounded-md text-center text-sm">
            Em breve
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Resultados</h2>
            {result.metadata && (
              <span className="text-sm text-muted-foreground">
                {result.metadata.totalRows} linhas • {result.metadata.executionTime}ms
              </span>
            )}
          </div>

          {/* Filters Section - only show for product template */}
          {activeTemplate === 'product' && (
            <div className="border rounded-lg p-4 mb-6 bg-muted/30">
              <h3 className="text-sm font-semibold mb-3">Filtros</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Canal</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
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
                  <label className="block text-xs font-medium mb-1">Dia da Semana</label>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
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
                  <label className="block text-xs font-medium mb-1">Horário De</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Ex: 19"
                    value={filters.hourFrom || ''}
                    onChange={(e) => setFilters({ ...filters, hourFrom: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Horário Até</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Ex: 23"
                    value={filters.hourTo || ''}
                    onChange={(e) => setFilters({ ...filters, hourTo: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <button
                onClick={applyFiltersToProducts}
                disabled={loading}
                className="mt-3 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Aplicar Filtros'}
              </button>
            </div>
          )}

          {result.error ? (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
              {result.error}
            </div>
          ) : result.data && result.data.length > 0 ? (
            <>
              {/* Charts */}
              {activeTemplate === null && (
                <div className="mb-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={result.data}
                        dataKey="faturamento"
                        nameKey="channel_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry: any) => `Canal ${entry.channel_id}: ${(entry.faturamento / 1000).toFixed(0)}k`}
                      >
                        {result.data.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(result.data[0] || {}).map((key) => {
                        const isSortable = isSortableColumn(key);
                        const isSorted = sortConfig?.key === key;
                        return (
                          <th 
                            key={key} 
                            className={`text-left p-2 font-semibold ${isSortable ? 'cursor-pointer hover:bg-muted select-none' : ''}`}
                            onClick={() => isSortable && handleSort(key)}
                          >
                            <div className="flex items-center gap-2">
                              <span>{key}</span>
                              {isSorted && (
                                <span className="text-xs">
                                  {sortConfig?.direction === 'asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData().slice(0, 20).map((row: any, idx: number) => (
                      <tr key={idx} className="border-b">
                        {Object.entries(row).map(([key, cell]: [string, any], cellIdx: number) => (
                          <td key={cellIdx} className="p-2">
                            {key === 'tempo_medio' && typeof cell === 'string' ? `${cell} min` :
                             typeof cell === 'number' ? cell.toLocaleString('pt-BR') : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.data.length > 20 && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Mostrando 20 de {result.data.length} resultados
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum dado encontrado
            </div>
          )}

          {/* SQL View */}
          {result.metadata?.sql && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium mb-2">
                Ver SQL Gerado
              </summary>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
                {result.metadata.sql}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
