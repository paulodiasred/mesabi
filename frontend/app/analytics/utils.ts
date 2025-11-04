/**
 * Mapeamento de páginas para seus respectivos hubs
 */
export const getHubForPage = (pagePath: string): string | null => {
  const hubMap: Record<string, string> = {
    // Produtos Hub
    '/analytics/produtos': '/analytics/produtos-hub',
    '/analytics/items': '/analytics/produtos-hub',
    '/analytics/produtos-alteracoes': '/analytics/produtos-hub',
    '/analytics/mix-produtos': '/analytics/produtos-hub',
    
    // Vendas Hub
    '/analytics/canais': '/analytics/vendas-hub',
    '/analytics/ticket-medio': '/analytics/vendas-hub',
    '/analytics/margem': '/analytics/vendas-hub',
    '/analytics/cancelamentos': '/analytics/vendas-hub',
    '/analytics/descontos': '/analytics/vendas-hub',
    
    // Performance Hub
    '/analytics/lojas': '/analytics/performance-hub',
    '/analytics/horario': '/analytics/performance-hub',
    
    // Páginas diretas (sem hub específico) retornam null
    // '/analytics/entrega': null,
    // '/analytics/clientes': null,
  };
  
  return hubMap[pagePath] || null;
};

export const getHubName = (hubPath: string): string => {
  const names: Record<string, string> = {
    '/analytics/produtos-hub': 'Produtos',
    '/analytics/vendas-hub': 'Vendas & Operação',
    '/analytics/performance-hub': 'Performance',
  };
  
  return names[hubPath] || 'Hub';
};

