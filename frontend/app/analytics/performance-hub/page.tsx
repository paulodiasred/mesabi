'use client';

import Link from 'next/link';

export default function PerformanceHubPage() {
  const analytics = [
    {
      title: 'Performance das Lojas',
      description: 'Compare faturamento, vendas, ticket médio e tempo de entrega entre lojas',
      icon: '🏪',
      href: '/analytics/lojas',
      gradient: 'from-indigo-600 to-indigo-500'
    },
    {
      title: 'Performance por Horário',
      description: 'Analise vendas e faturamento por hora do dia ou dia da semana',
      icon: '⏰',
      href: '/analytics/horario',
      gradient: 'from-purple-600 to-purple-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Voltar para Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⚡ Performance</h1>
        <p className="text-gray-600">
          Análises de performance por loja e horário
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

