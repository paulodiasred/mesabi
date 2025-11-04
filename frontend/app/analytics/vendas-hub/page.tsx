'use client';

import Link from 'next/link';

export default function VendasHubPage() {
  const analytics = [
    {
      title: 'Faturamento por Canal',
      description: 'Visualize quanto cada canal está faturando',
      icon: '📊',
      href: '/analytics/canais',
      gradient: 'from-blue-600 to-blue-500'
    },
    {
      title: 'Ticket Médio',
      description: 'Identifique se o ticket médio está caindo por canal ou por loja',
      icon: '💰',
      href: '/analytics/ticket-medio',
      gradient: 'from-yellow-600 to-yellow-500'
    },
    {
      title: 'Produtos com Menor Margem',
      description: 'Identifique produtos com menor margem e avalie se precisa repensar o preço',
      icon: '📉',
      href: '/analytics/margem',
      gradient: 'from-red-600 to-red-500'
    },
    {
      title: 'Taxa de Cancelamento',
      description: 'Monitore a taxa de cancelamento e identifique padrões',
      icon: '❌',
      href: '/analytics/cancelamentos',
      gradient: 'from-red-700 to-red-600'
    },
    {
      title: 'Análise de Descontos',
      description: 'Monitore descontos aplicados e identifique padrões',
      icon: '🎁',
      href: '/analytics/descontos',
      gradient: 'from-pink-600 to-pink-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Voltar para Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💼 Vendas & Operação</h1>
        <p className="text-gray-600">
          Análises de performance de vendas, canais, margens e operações
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {analytics.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="border rounded-2xl p-6 soft-shadow card-hover block bg-white hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="text-5xl flex-shrink-0">{item.icon}</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  {item.description}
                </p>
                <div className={`w-full bg-gradient-to-r ${item.gradient} text-white px-4 py-3 rounded-xl hover:opacity-90 transition-all text-center font-medium`}>
                  Ver Análise →
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

