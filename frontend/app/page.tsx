'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function Home() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        // Faturamento do mês
        const fatResponse = await fetch(`${API_URL}/query/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'vendas',
            measures: [{ name: 'faturamento', aggregation: 'sum', field: 'total_amount' }],
            dimensions: [],
            filters: [
              {
                field: 'created_at',
                op: '>=',
                value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              }
            ]
          }),
        });
        const fatData = await fatResponse.json();

        // Top 10 produtos
        const prodResponse = await fetch(`${API_URL}/query/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'produtos',
            measures: [
              { name: 'quantidade', aggregation: 'sum', field: 'quantity' }
            ],
            dimensions: [{ name: 'Produto', field: 'product_id' }],
            limit: 10
          }),
        });
        const prodData = await prodResponse.json();

        // Total de vendas
        const salesResponse = await fetch(`${API_URL}/query/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: 'vendas',
            measures: [{ name: 'total_vendas', aggregation: 'count', field: 'id' }],
            dimensions: [],
            filters: [
              {
                field: 'created_at',
                op: '>=',
                value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              }
            ]
          }),
        });
        const salesData = await salesResponse.json();

        setOverview({
          faturamento: fatData.data?.[0]?.faturamento || 0,
          vendas: salesData.data?.[0]?.total_vendas || 0,
          topProdutos: prodData.data?.slice(0, 3) || []
        });
      } catch (error) {
        console.error('Erro ao buscar overview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Análises</h1>
        <p className="text-gray-600">
          Análises prontas para responder as perguntas da sua operação
        </p>
      </div>

      {/* Overview Dashboard */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Faturamento */}
        <div className="border rounded-2xl p-6 soft-shadow bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-sm text-purple-700 font-medium mb-2">💰 Faturamento (30 dias)</div>
          {loading ? (
            <div className="text-2xl font-bold text-purple-900">Carregando...</div>
          ) : (
            <div className="text-3xl font-bold text-purple-900">
              {formatCurrency(overview?.faturamento || 0)}
            </div>
          )}
        </div>

        {/* Total Vendas */}
        <div className="border rounded-2xl p-6 soft-shadow bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-sm text-blue-700 font-medium mb-2">📊 Total de Vendas (30 dias)</div>
          {loading ? (
            <div className="text-2xl font-bold text-blue-900">Carregando...</div>
          ) : (
            <div className="text-3xl font-bold text-blue-900">
              {overview?.vendas?.toLocaleString('pt-BR') || 0}
            </div>
          )}
        </div>

        {/* Top 3 Produtos */}
        <div className="border rounded-2xl p-6 soft-shadow bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="text-sm text-orange-700 font-medium mb-3">🏆 Top 3 Produtos</div>
          {loading ? (
            <div className="text-lg font-bold text-orange-900">Carregando...</div>
          ) : overview?.topProdutos?.length > 0 ? (
            <div className="space-y-2">
              {overview.topProdutos.map((p: any, i: number) => (
                <div key={i} className="text-sm text-orange-900 truncate">
                  {i + 1}. {p.product_name || `Produto ${p.product_id}`}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-lg font-bold text-orange-900">Sem dados</div>
          )}
        </div>
      </div>

      {/* Templates Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Template 1 */}
        <Link href="/analytics/produtos" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">🍔</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Produtos Mais Vendidos</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Descubra quais produtos vendem mais em cada canal e horário
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        {/* Template 2 */}
        <Link href="/analytics/entrega" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">🚚</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Tempo de Entrega</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Compare tempos de entrega entre períodos e regiões
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        {/* Template 3 */}
        <Link href="/analytics/clientes" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Clientes para Recompra</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Identifique clientes que compraram várias vezes mas sumiram
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        {/* Quick Analytics */}
        <Link href="/analytics/canais" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Faturamento por Canal</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Visualize quanto cada canal está faturando
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/ticket-medio" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">💰</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Ticket Médio</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Identifique se o ticket médio está caindo por canal ou por loja
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/margem" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">📉</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Produtos com Menor Margem</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Identifique produtos com menor margem e avalie se precisa repensar o preço
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/horario" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">⏰</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Performance por Horário</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Analise vendas e faturamento por hora do dia ou dia da semana
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/cancelamentos" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">❌</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Taxa de Cancelamento</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Monitore a taxa de cancelamento e identifique padrões
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/descontos" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">🎁</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Análise de Descontos</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Monitore descontos aplicados e identifique padrões
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/items" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">🔧</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Items Mais Vendidos</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Descubra quais complementos, molhos e adicionais são mais solicitados
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/produtos-alteracoes" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white">
          <div className="text-5xl mb-4">🔄</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Produtos com Mais Alterações</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Descubra quais produtos recebem mais customizações e itens adicionais
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        <Link href="/analytics/lojas" className="md:col-span-2 lg:col-span-3 border rounded-2xl p-6 soft-shadow card-hover block bg-gradient-to-br from-indigo-50 to-indigo-100">
          <div className="flex items-center gap-4">
            <div className="text-6xl">🏪</div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2 text-indigo-900">Performance das Lojas</h3>
              <p className="text-base text-indigo-700 mb-4">
                Compare faturamento, vendas, ticket médio e tempo de entrega entre lojas
              </p>
              <div className="w-full max-w-xs bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all text-center font-medium">
                Ver Análise →
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

