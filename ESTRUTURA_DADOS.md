# 📊 Estrutura de Dados - ComidaSmart

Este documento descreve a estrutura de dados do projeto ComidaSmart.

## 🎯 Objetivo

Banco PostgreSQL com 6 meses de dados operacionais de restaurantes, simulando um sistema real de gestão de 1000+ estabelecimentos.

## 📋 Schema Principal

### Hierarquia de Vendas

```
Sale (Venda)
├── Store (Loja)
├── Channel (Canal: presencial/delivery)
├── Customer (Cliente - opcional, 70% identificados)
│
├── ProductSales[] (1-5 produtos por venda)
│   ├── Product
│   └── ItemProductSales[] (customizações: "sem cebola", "+bacon")
│       ├── Item (complemento/adicional)
│       ├── OptionGroup (grupo: "Adicionais", "Remover")
│       └── ItemItemProductSales[] (itens em itens - nested)
│
├── Payments[] (1-2 formas de pagamento)
│   └── PaymentType
│
└── DeliverySale (se delivery)
    ├── Courier info (entregador)
    └── DeliveryAddress
```

## 🗄️ Tabelas Core

### Vendas (núcleo)
- **sales**: Vendas principais
  - IDs: store_id, channel_id, customer_id, sub_brand_id
  - Financeiro: total_amount_items, total_discount, total_increase, delivery_fee, service_tax_fee, total_amount, value_paid
  - Operacional: production_seconds, delivery_seconds, people_quantity
  - Metadata: sale_status_desc, origin, discount_reason

### Produtos
- **products**: Catálogo de produtos
- **items**: Complementos/Adicionais
- **categories**: Categorias (P=Produto, I=Item)
- **option_groups**: Grupos de opções

### Vendas de Produtos
- **product_sales**: Produtos vendidos
- **item_product_sales**: Customizações de produtos (ex: "Hamburguer + Bacon + Queijo extra")
- **item_item_product_sales**: Customizações nested (ex: "Bacon + Cheddar cremoso")

### Entrega
- **delivery_sales**: Dados de entrega
  - Entregador: courier_name, courier_phone, courier_type
  - Info: delivery_type, status, delivery_fee, courier_fee
- **delivery_addresses**: Endereços de entrega
  - Localização: street, number, neighborhood, city, state, postal_code
  - Coordenadas: latitude, longitude

### Pagamentos
- **payments**: Pagamentos (venda pode ter múltiplos)
- **payment_types**: Tipos de pagamento (Dinheiro, PIX, Cartão, etc.)

### Entidades
- **stores**: Lojas (id, name, city, state, is_active, is_own)
- **channels**: Canais (id, name, type: P=Presencial, D=Delivery)
- **customers**: Clientes (id, customer_name, email, phone_number, birth_date)
- **brands**: Marcas
- **sub_brands**: Sub-marcas

## 📊 Volume de Dados Esperado

- **50 lojas** → **500.000 vendas** → **1.2M produtos vendidos** → **800k customizações**
- **10k clientes** (70% das vendas identificadas)

## 🎲 Distribuição

### Vendas por Canal
- **Presencial**: 40% (~200k vendas)
- **iFood**: 30% (~150k)
- **Rappi**: 15% (~75k)
- **Outros**: 15% (~75k)

### Produtos
- **500 produtos** base
- **200 items/complementos**
- **Média 2.4 produtos** por venda
- **60% das vendas** têm customizações

### Clientes
- **10.000** cadastrados
- **30%** vendas são "guest" (sem cadastro)
- **Distribuição**: 70% 1-3x, 20% 4-10x, 10% 10+x

## ⏰ Padrões Temporais

### Intra-dia
- **00-06h**: 2% das vendas
- **06-11h**: 8%
- **11-15h**: 35% ⚡ (almoço)
- **15-19h**: 10%
- **19-23h**: 40% ⚡ (jantar)
- **23-24h**: 5%

### Semanal
- **Segunda**: -20% vs média
- **Terça**: -10%
- **Quarta**: -5%
- **Quinta**: 0% (baseline)
- **Sexta**: +30%
- **Sábado**: +50% ⚡
- **Domingo**: +40%

### Mensal
- Crescimento gradual: ~2-3% mês a mês
- Variação aleatória: ±10%

## 💰 Valores Típicos

- **Ticket médio geral**: R$ 65
  - Presencial: R$ 45-55
  - iFood: R$ 70-85
  - Rappi: R$ 65-80

- **Tempos operacionais**:
  - Preparo: 5-40 min (média 18 min)
  - Entrega: 15-60 min (média 35 min)

- **Taxas**:
  - Cancelamento: ~5%
  - Com desconto: ~20%
  - Com customização: ~60%

## 🎯 Anomalias Injetadas

Para testar analytics:

- **Semana problemática**: Queda de 30% em vendas
- **Dia promocional**: Pico de 3x (Black Friday)
- **Loja crescendo**: Crescimento linear de 5%/mês
- **Produto sazonal**: 80% mais vendas em determinados meses

## 🔍 Queries de Exemplo

### Vendas completas com produtos e customizações
```sql
SELECT 
    s.id, s.created_at, s.total_amount,
    st.name as store, ch.name as channel,
    p.name as product,
    ps.quantity,
    array_agg(i.name) as customizations
FROM sales s
JOIN stores st ON st.id = s.store_id
JOIN channels ch ON ch.id = s.channel_id
JOIN product_sales ps ON ps.sale_id = s.id
JOIN products p ON p.id = ps.product_id
LEFT JOIN item_product_sales ips ON ips.product_sale_id = ps.id
LEFT JOIN items i ON i.id = ips.item_id
WHERE s.sale_status_desc = 'COMPLETED'
  AND DATE(s.created_at) >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY s.id, st.name, ch.name, p.name, ps.quantity
LIMIT 10;
```

### Top itens/complementos mais vendidos
```sql
SELECT 
    i.name as item,
    COUNT(*) as times_added,
    SUM(ips.additional_price) as revenue_generated
FROM item_product_sales ips
JOIN items i ON i.id = ips.item_id
JOIN product_sales ps ON ps.id = ips.product_sale_id
JOIN sales s ON s.id = ps.sale_id
WHERE s.sale_status_desc = 'COMPLETED'
GROUP BY i.name
ORDER BY times_added DESC
LIMIT 20;
```

### Performance de entrega por região
```sql
SELECT 
    da.city,
    da.state,
    COUNT(*) as deliveries,
    AVG(s.delivery_seconds / 60.0) as avg_delivery_minutes
FROM sales s
JOIN delivery_addresses da ON da.sale_id = s.id
WHERE s.sale_status_desc = 'COMPLETED'
  AND s.delivery_seconds IS NOT NULL
GROUP BY da.city, da.state
HAVING COUNT(*) >= 10
ORDER BY avg_delivery_minutes DESC;
```

## 🚀 Script de Seed

Execute para popular o banco com dados de exemplo:

```bash
npm run prisma:seed
```

Isso gera:
- ~50 vendas de exemplo
- 3 lojas
- 5 produtos
- 2 clientes
- 4 canais
- Dados dos últimos 30 dias

**Tempo estimado**: 1-2 minutos.

## 🎯 O Que Isso Habilita

Com essa estrutura completa, o ComidaSmart pode responder:

- ✅ Faturamento total, ticket médio, vendas por dia
- ✅ Rankings de lojas e produtos
- ✅ Performance por canal e horário
- ✅ Taxa de cancelamento e motivos
- ✅ Análise de descontos
- ✅ Customizações: Quais items mais vendidos?
- ✅ Delivery: Tempo médio por região?
- ✅ Mix de produtos: Quais combinações aparecem juntas?
- ✅ Jornada do cliente: Frequência, retenção
- ✅ Detecção de anomalias temporais
- ✅ Previsão de demanda por produto
- ✅ Segmentação de clientes

## 📁 Arquivos Relacionados

- `database-schema.sql`: Schema SQL completo
- `backend/prisma/schema.prisma`: Schema Prisma (usado pela aplicação)
- `backend/prisma/seed.ts`: Script de seed automático

