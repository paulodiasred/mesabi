'use client';

import Link from 'next/link';

export default function ProdutosHubPage() {
  const analytics = [
    {
      title: 'Produtos Mais Vendidos',
      description: 'Descubra quais produtos vendem mais em cada canal e horário',
      icon: '🍔',
      href: '/analytics/produtos',
      gradient: 'from-purple-600 to-purple-500'
    },
    {
      title: 'Items Mais Vendidos',
      description: 'Descubra quais complementos, molhos e adicionais são mais solicitados',
      icon: '🔧',
      href: '/analytics/items',
      gradient: 'from-blue-600 to-blue-500'
    },
    {
      title: 'Produtos com Mais Alterações',
      description: 'Descubra quais produtos recebem mais customizações e itens adicionais',
      icon: '🔄',
      href: '/analytics/produtos-alteracoes',
      gradient: 'from-green-600 to-green-500'
    },
    {
      title: 'Mix de Produtos',
      description: 'Descubra quais produtos são frequentemente comprados juntos',
      icon: '🍽️',
      href: '/analytics/mix-produtos',
      gradient: 'from-orange-600 to-orange-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Voltar para Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📦 Análises de Produtos</h1>
        <p className="text-gray-600">
          Explore análises detalhadas sobre produtos, itens, alterações e combinações
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

