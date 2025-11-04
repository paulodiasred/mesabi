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

      {/* Categorias Principais */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Produtos */}
        <Link href="/analytics/produtos-hub" className="border rounded-2xl p-6 soft-shadow card-hover block bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-xl font-bold mb-3 text-purple-900">Análises de Produtos</h3>
          <p className="text-sm text-purple-700 mb-4 leading-relaxed">
            Produtos vendidos, items, alterações e combinações
          </p>
          <div className="text-xs text-purple-600 mb-4">
            4 análises disponíveis
          </div>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Explorar →
          </div>
        </Link>

        {/* Vendas & Operação */}
        <Link href="/analytics/vendas-hub" className="border rounded-2xl p-6 soft-shadow card-hover block bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all">
          <div className="text-5xl mb-4">💼</div>
          <h3 className="text-xl font-bold mb-3 text-blue-900">Vendas & Operação</h3>
          <p className="text-sm text-blue-700 mb-4 leading-relaxed">
            Canais, ticket médio, margens, cancelamentos e descontos
          </p>
          <div className="text-xs text-blue-600 mb-4">
            5 análises disponíveis
          </div>
          <div className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all text-center font-medium">
            Explorar →
          </div>
        </Link>

        {/* Performance */}
        <Link href="/analytics/performance-hub" className="border rounded-2xl p-6 soft-shadow card-hover block bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-lg transition-all">
          <div className="text-5xl mb-4">⚡</div>
          <h3 className="text-xl font-bold mb-3 text-indigo-900">Performance</h3>
          <p className="text-sm text-indigo-700 mb-4 leading-relaxed">
            Performance por loja e horário
          </p>
          <div className="text-xs text-indigo-600 mb-4">
            2 análises disponíveis
          </div>
          <div className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all text-center font-medium">
            Explorar →
          </div>
        </Link>

        {/* Entrega */}
        <Link href="/analytics/entrega" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white hover:shadow-lg transition-all">
          <div className="text-5xl mb-4">🚚</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Tempo de Entrega</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Compare tempos de entrega entre períodos e regiões
          </p>
          <div className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-3 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        {/* Clientes */}
        <Link href="/analytics/clientes" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white hover:shadow-lg transition-all">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Clientes para Recompra</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Identifique clientes que compraram várias vezes mas sumiram
          </p>
          <div className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>

        {/* Comparativo Customizado */}
        <Link href="/analytics/comparativo" className="border rounded-2xl p-6 soft-shadow card-hover block bg-white hover:shadow-lg transition-all">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-3 text-gray-900">Comparativo Customizado</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Compare métricas entre períodos, canais, lojas ou produtos de forma personalizada
          </p>
          <div className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-4 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all text-center font-medium">
            Ver Análise →
          </div>
        </Link>
      </div>
    </div>
  );
}

