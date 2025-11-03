import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Image from 'next/image';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ComidaSmart - Analytics para Restaurantes',
  description: 'Plataforma de analytics plug-and-play para restaurantes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-72 bg-gradient-to-b from-purple-700 to-purple-800 shadow-[8px_0_25px_rgba(0,0,0,0.2)] flex flex-col relative z-10">
              <div className="p-8 border-b border-purple-500/50 bg-gradient-to-r from-purple-600/30 to-purple-500/30 backdrop-blur-sm">
                <a href="/" className="transition-transform hover:scale-105 block">
                  <Image 
                    src="/logo.png" 
                    alt="ComidaSmart Logo" 
                    width={480} 
                    height={160}
                    className="h-36 w-auto mx-auto brightness-125 contrast-110 drop-shadow-2xl"
                    priority
                  />
                </a>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/25 hover:shadow-lg transition-all duration-200 group font-semibold">
                  <span className="text-xl">🏠</span>
                  <span className="font-medium group-hover:translate-x-1 transition-transform">Home</span>
                </a>
                <div className="text-xs text-purple-200 uppercase tracking-wider px-4 py-3 font-bold">
                  Análises
                </div>
                <a href="/analytics/produtos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">🍔</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Produtos</span>
                </a>
                <a href="/analytics/entrega" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">🚚</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Entrega</span>
                </a>
                <a href="/analytics/clientes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">👥</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Clientes</span>
                </a>
                <a href="/analytics/canais" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">📊</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Canais</span>
                </a>
                <a href="/analytics/ticket-medio" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">💰</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Ticket Médio</span>
                </a>
                <a href="/analytics/margem" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">📉</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Margem</span>
                </a>
                <a href="/analytics/lojas" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">🏪</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Lojas</span>
                </a>
                <a href="/analytics/horario" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">⏰</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Horário</span>
                </a>
                <a href="/analytics/cancelamentos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">❌</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Cancelamentos</span>
                </a>
                <a href="/analytics/descontos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">🎁</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Descontos</span>
                </a>
                <a href="/analytics/items" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">🔧</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Items</span>
                </a>
                <a href="/analytics/produtos-alteracoes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-purple-100 hover:bg-white/25 hover:shadow-lg transition-all duration-200 group">
                  <span className="text-lg">🔄</span>
                  <span className="font-medium text-sm group-hover:translate-x-1 transition-transform">Produtos Alterações</span>
                </a>
              </nav>
              <div className="p-5 border-t border-purple-500/50 bg-gradient-to-t from-purple-900/30 to-transparent">
                <div className="text-xs text-purple-200/80 text-center font-medium">
                  Powered by<br/><span className="text-purple-100">Paulo Dias</span>
                </div>
              </div>
            </aside>
            
            {/* Main Content */}
            <main className="flex-1 ml-0">
              <div className="container mx-auto px-6 py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
