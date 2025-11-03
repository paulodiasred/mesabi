'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface QueryResult {
  data: any[];
  metadata?: {
    totalRows: number;
    executionTime: number;
  };
  error?: string;
}

// Margens base médias por categoria
const MARGEM_BASE_POR_CATEGORIA: { [key: string]: { base: number, variação: number } } = {
  'Burgers': { base: 0.65, variação: 0.15 },      // 65% ± 15% (50-80%)
  'Pizzas': { base: 0.70, variação: 0.12 },       // 70% ± 12% (58-82%)
  'Pratos': { base: 0.55, variação: 0.18 },       // 55% ± 18% (37-73%)
  'Combos': { base: 0.45, variação: 0.20 },       // 45% ± 20% (25-65%)
  'Sobremesas': { base: 0.75, variação: 0.10 },   // 75% ± 10% (65-85%)
  'Bebidas': { base: 0.80, variação: 0.08 }       // 80% ± 8% (72-88%)
};

export default function MargemPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [expandedTable, setExpandedTable] = useState(false);

  useEffect(() => {
    executeQuery();
  }, []);

  const executeQuery = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'produtos',
          measures: [
            { name: 'faturamento', aggregation: 'sum', field: 'total_price' },
            { name: 'quantidade', aggregation: 'sum', field: 'quantity' }
          ],
          dimensions: [{ name: 'Produto', field: 'product_id' }],
          limit: 50
        }),
      });

      const data = await response.json();
      
      // Calcular margem fictícia com variação baseada no nome do produto
      const processed = (data.data || []).map((row: any) => {
        // Determinar categoria pelo nome do produto
        const nome = (row.product_name || '').toLowerCase();
        let configMargem = { base: 0.60, variação: 0.15 }; // Default
        
        // Detectar categoria
        if (nome.includes('burger')) configMargem = MARGEM_BASE_POR_CATEGORIA['Burgers'];
        else if (nome.includes('pizza')) configMargem = MARGEM_BASE_POR_CATEGORIA['Pizzas'];
        else if (nome.includes('combo')) configMargem = MARGEM_BASE_POR_CATEGORIA['Combos'];
        else if (nome.includes('refrigerante') || nome.includes('água') || nome.includes('cerveja') || nome.includes('suco')) configMargem = MARGEM_BASE_POR_CATEGORIA['Bebidas'];
        else if (nome.includes('brownie') || nome.includes('torta') || nome.includes('sorvete') || nome.includes('pudim')) configMargem = MARGEM_BASE_POR_CATEGORIA['Sobremesas'];
        else if (nome.includes('file') || nome.includes('prato') || nome.includes('lasanha') || nome.includes('risoto') || nome.includes('frango') || nome.includes('portuguesa')) configMargem = MARGEM_BASE_POR_CATEGORIA['Pratos'];
        
        // Usar product_id como seed para gerar margem consistente para o mesmo produto
        const seed = row.product_id || 0;
        const randomValue = ((seed * 9301 + 49297) % 233280) / 233280; // Pseudo-aleatório baseado no ID
        const variacao = (randomValue - 0.5) * 2 * configMargem.variação; // -variação até +variação
        const margem = Math.max(0.20, Math.min(0.90, configMargem.base + variacao)); // Limitar entre 20% e 90%
        
        const receita = row.faturamento || 0;
        const custo = receita * (1 - margem);
        const lucro = receita - custo;
        const margemBruta = receita > 0 ? (lucro / receita) * 100 : 0;
        
        return {
          ...row,
          margem_percentual: margemBruta,
          lucro_bruto: lucro,
          custo_total: custo,
          preco_medio: row.quantidade > 0 ? receita / row.quantidade : 0
        };
      });

      setResult({ ...data, data: processed });
    } catch (error) {
      console.error('Error:', error);
      setResult({ data: [], error: 'Erro ao executar query' });
    } finally {
      setLoading(false);
    }
  };

  // Ordenar por menor margem percentual
  const sortedData = result?.data ? [...result.data].sort((a, b) => a.margem_percentual - b.margem_percentual) : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📉 Produtos com Menor Margem</h1>
        <p className="text-gray-600">
          Identifique produtos com menor margem e avalie se precisa repensar o preço
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Sobre a Análise de Margem</h3>
            <p className="text-sm text-blue-800">
              Esta análise calcula <strong>margens fictícias</strong> baseadas em padrões típicos da indústria de restaurantes.
              Margens variam por categoria: Bebidas (80%), Sobremesas (75%), Pizzas (70%), Burgers (65%), Pratos (55%), Combos (45%).
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div ref={reportRef} className="border rounded-2xl p-6 soft-shadow bg-white">
          {result.error ? (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
              {result.error}
            </div>
          ) : result.data && result.data.length > 0 ? (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={async () => {
                    if (!reportRef.current) return;
                    // Expandir tabela antes de gerar PDF
                    const wasExpanded = expandedTable;
                    if (!expandedTable) setExpandedTable(true);
                    // Aguardar renderização
                    await new Promise(resolve => setTimeout(resolve, 100));
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
                    pdf.save(`produtos-menor-margem-${new Date().toISOString().split('T')[0]}.pdf`);
                    // Restaurar estado anterior
                    if (!wasExpanded) setExpandedTable(false);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  📄 Gerar PDF
                </button>
              </div>
              {/* Chart */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">
                  Produtos com Menor Margem (Top 15)
                </h3>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={sortedData.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="product_name"
                      angle={-90}
                      textAnchor="end"
                      height={180}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                    <Bar dataKey="margem_percentual" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Detalhamento</h3>
                  {!expandedTable && sortedData.length > 10 && (
                    <button
                      onClick={() => setExpandedTable(true)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Ver todos ({sortedData.length})
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Produto</th>
                        <th className="text-right p-3 font-semibold">Margem</th>
                        <th className="text-right p-3 font-semibold" colSpan={2}>
                          <div className="flex flex-col">
                            <span>Faturamento</span>
                          </div>
                        </th>
                        <th className="text-right p-3 font-semibold" colSpan={2}>
                          <div className="flex flex-col">
                            <span>Lucro Bruto</span>
                          </div>
                        </th>
                        <th className="text-right p-3 font-semibold">Quantidade</th>
                      </tr>
                      <tr className="border-b bg-gray-50">
                        <th></th>
                        <th></th>
                        <th className="text-right p-2 text-xs font-normal text-gray-600">Valor</th>
                        <th className="text-right p-2 text-xs font-normal text-gray-600">Participação</th>
                        <th className="text-right p-2 text-xs font-normal text-gray-600">Valor</th>
                        <th className="text-right p-2 text-xs font-normal text-gray-600">Participação</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalFaturamento = sortedData.reduce((acc, row) => acc + (row.faturamento || 0), 0);
                        const totalLucro = sortedData.reduce((acc, row) => acc + (row.lucro_bruto || 0), 0);
                        
                        return sortedData.slice(0, expandedTable ? 1000 : 10).map((row: any, idx: number) => {
                          const pctFaturamento = totalFaturamento > 0 ? (row.faturamento / totalFaturamento) * 100 : 0;
                          const pctLucro = totalLucro > 0 ? (row.lucro_bruto / totalLucro) * 100 : 0;
                          
                          return (
                            <tr key={idx} className="border-b hover:bg-red-50/50 transition-colors">
                              <td className="p-3 font-medium">{row.product_name || `Produto ${row.product_id}`}</td>
                              <td className={`p-3 text-right font-semibold ${
                                row.margem_percentual < 50 
                                  ? 'text-red-600 bg-red-50' 
                                  : row.margem_percentual < 60 
                                    ? 'text-orange-600 bg-orange-50'
                                    : 'text-gray-700'
                              }`}>
                                {row.margem_percentual?.toFixed(1) || '0.0'}%
                              </td>
                              <td className="p-3 text-right text-gray-700">
                                R$ {row.faturamento?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </td>
                              <td className="p-3 text-right text-gray-500 text-sm">
                                {pctFaturamento.toFixed(1)}%
                              </td>
                              <td className="p-3 text-right text-gray-700">
                                R$ {row.lucro_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </td>
                              <td className="p-3 text-right text-gray-500 text-sm">
                                {pctLucro.toFixed(1)}%
                              </td>
                              <td className="p-3 text-right text-gray-700">
                                {row.quantidade?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || '0'}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
                {expandedTable && sortedData.length > 10 && (
                  <button
                    onClick={() => setExpandedTable(false)}
                    className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            </>
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

