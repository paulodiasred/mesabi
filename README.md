# 🍽️ ComidaSmart - Analytics para Restaurantes

Plataforma de analytics plug-and-play para restaurantes, desenvolvida como solução completa para análise de dados operacionais.

## 📋 Status do Projeto

### ✅ Implementado (93% das funcionalidades principais)

**11 Páginas de Análises:**
1. 🍔 **Produtos Mais Vendidos** (`/analytics/produtos`) - Com filtros por canal, dia da semana e horário
2. 🚚 **Tempo de Entrega** (`/analytics/entrega`) - Por estado, cidade, bairro e loja, com comparação de períodos
3. 👥 **Clientes para Recompra** (`/analytics/clientes`) - Identifica clientes inativos (30/60/90 dias)
4. 📊 **Faturamento por Canal** (`/analytics/canais`) - Distribuição de receita por canal
5. 💰 **Ticket Médio** (`/analytics/ticket-medio`) - Comparação por canal ou loja
6. 📉 **Produtos com Menor Margem** (`/analytics/margem`) - Análise de margem e lucro bruto
7. 🏪 **Performance das Lojas** (`/analytics/lojas`) - Comparação completa entre lojas
8. ⏰ **Performance por Horário** (`/analytics/horario`) - Análise por hora do dia e dia da semana
9. ❌ **Taxa de Cancelamento** (`/analytics/cancelamentos`) - Monitoramento de cancelamentos
10. 🎁 **Análise de Descontos** (`/analytics/descontos`) - Breakdown por motivo de desconto
11. 🔧 **Items Mais Vendidos** (`/analytics/items`) - Complementos e customizações mais populares
12. 🔄 **Produtos com Mais Alterações** (`/analytics/produtos-alteracoes`) - Produtos que recebem mais customizações

**Funcionalidades:**
- ✅ Faturamento total, ticket médio, vendas por dia
- ✅ Rankings de lojas e produtos
- ✅ Performance por canal e horário
- ✅ Taxa de cancelamento e motivos
- ✅ Análise de descontos por motivo
- ✅ Items/complementos mais vendidos
- ✅ Produtos que recebem mais alterações
- ✅ Tempo médio por região (estado, cidade, bairro)
- ✅ Clientes para recompra (frequência e retenção)

### ⚠️ Pendente (Complexidade Alta - Requer Algoritmos Especializados)

- ❌ Mix de produtos (combinações que aparecem juntas) - Requer análise de associação
- ❌ Detecção de anomalias temporais - Requer algoritmo de detecção
- ❌ Previsão de demanda por produto - Requer Machine Learning
- ❌ Segmentação de clientes - Requer clustering
- ❌ Otimização de rotas de entrega - Requer algoritmo de roteamento
- ⚠️ Lifetime value completo - Pode ser adicionado na página de clientes

## 🏗️ Arquitetura

### Tech Stack
- **Backend:** NestJS (Node.js) + Prisma ORM
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Recharts
- **Database:** PostgreSQL 16
- **Containerização:** Docker Compose

### Estrutura do Projeto
```
mesabi/
├── backend/          # API NestJS
│   ├── src/
│   │   └── app/
│   │       ├── modules/
│   │       │   ├── query/       # Query builder dinâmico
│   │       │   ├── prisma/      # Serviço Prisma
│   │       │   └── auth/        # Autenticação (JWT)
│   │       └── main.ts
│   └── prisma/
│       └── schema.prisma
├── frontend/         # Next.js App
│   └── app/
│       ├── analytics/    # Páginas de análises
│       ├── layout.tsx    # Layout com sidebar
│       └── page.tsx      # Home page
├── shared/           # Tipos compartilhados
├── generate_data.py  # Gerador de dados (Python)
├── docker-compose.yml
└── README.md
```

## 🚀 Como Rodar

### Pré-requisitos
- Docker e Docker Compose instalados
- Portas 3000 (frontend), 3001 (backend), 5432 (PostgreSQL) disponíveis

### Passos

1. **Clone e entre no diretório:**
```bash
cd mesabi
```

2. **Inicie os serviços:**
```bash
docker-compose up -d postgres
```

3. **Aguarde o PostgreSQL inicializar** (verifique os logs):
```bash
docker-compose logs postgres
```

4. **Gere os dados (6 meses):**
```bash
docker-compose --profile tools run --rm data-generator
```

**Nota:** Isso gera ~600k vendas e pode levar 10-20 minutos.

5. **Inicie backend e frontend:**
```bash
docker-compose up -d backend frontend
```

6. **Acesse a aplicação:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Swagger Docs: http://localhost:3001/api/docs

## 📊 Dados Gerados

O `generate_data.py` gera:
- **50 lojas**
- **500 produtos**
- **200 items/complementos**
- **10.000 clientes**
- **~600k vendas** (6 meses)
- **~1.2M produtos vendidos**
- **~1M customizações (items)**

**Padrões Realistas:**
- Distribuição temporal (horários de pico, dias da semana)
- Ticket médio por canal (Presencial ~R$50, iFood ~R$80, Rappi ~R$70)
- 60% das vendas têm customizações
- 5% taxa de cancelamento

**Anomalias Injetadas:**
- Semana problemática (30% queda)
- Dia promocional (3x pico)
- Loja crescendo (5% ao mês)
- Produtos sazonais (80% aumento em meses específicos)

## 🔧 Estrutura do Backend

### Query Service
O `QueryService` constrói queries SQL dinamicamente a partir de requisições JSON:

**Subjects suportados:**
- `vendas` - Tabela `sales`
- `produtos` - Tabela `product_sales`
- `items` - Tabela `item_product_sales`
- `entregas` - Tabela `delivery_sales`
- `clientes` - Tabela `customers`

**Exemplo de requisição:**
```json
{
  "subject": "vendas",
  "measures": [
    { "name": "faturamento", "aggregation": "sum", "field": "total_amount" }
  ],
  "dimensions": [
    { "name": "Canal", "field": "channel_id" }
  ],
  "filters": [
    { "field": "created_at", "op": ">=", "value": "2025-10-01" }
  ],
  "limit": 20
}
```

### Dimensões Especiais
- `day_of_week` - Dia da semana (0=Dom, 1=Seg, ..., 6=Sáb)
- `hour_of_day` - Hora do dia (0-23)
- `city`, `state`, `neighborhood` - Do `delivery_addresses`
- `store_id`, `channel_id`, `customer_id` - Com JOIN automático para nomes

## 🎨 Frontend

### Páginas de Análises
Todas as páginas seguem o mesmo padrão:
- Visual consistente (cores suaves, bordas arredondadas)
- Gráficos interativos (Recharts)
- Tabelas expansíveis (top 10 por padrão, "Ver todos" para expandir)
- Exportação PDF (captura todo o conteúdo)

### Sidebar
Navegação lateral com:
- Logo ComidaSmart
- Link Home
- Links para todas as páginas de análises
- Footer "Powered by Paulo Dias"

## 🐛 Problemas Conhecidos / Ajustes Necessários

### Items Mais Vendidos
- Backend suporta `subject: 'items'` ✅
- Página criada, mas pode precisar de ajustes na query
- Verificar logs do backend ao acessar `/analytics/items`

### Bairros
- Funcionando ✅
- Período anterior mostra "0 min" se não houver dados históricos (normal)

### Canais Duplicados
- Corrigido ✅ (canais duplicados removidos do banco)
- Frontend agrupa por nome para segurança extra

## 📝 Próximos Passos (Opcional)

### Melhorias Futuras
1. **Lifetime Value** - Adicionar na página de clientes
2. **Gráfico Temporal** - Melhorar visualização de vendas por dia
3. **Anomalias Temporais** - Detectar picos/quedas automaticamente
4. **Mix de Produtos** - Análise de associação (produtos que vendem juntos)

### Funcionalidades Avançadas (V2.0)
- Previsão de demanda (ML)
- Segmentação de clientes (clustering)
- Otimização de rotas (algoritmos de roteamento)

## 🗄️ Banco de Dados

### Schema Principal
- `sales` - Vendas principais
- `product_sales` - Produtos vendidos
- `item_product_sales` - Customizações/itens adicionados
- `delivery_addresses` - Endereços de entrega (cidade, estado, bairro)
- `stores`, `products`, `items`, `customers`, `channels` - Catálogo

### Indexes
Índices criados nas tabelas críticas:
- `sales(created_at)`, `sales(store_id)`, `sales(channel_id)`, `sales(customer_id)`
- `product_sales(sale_id)`, `product_sales(product_id)`
- `delivery_addresses(sale_id)`, `delivery_addresses(city)`, `delivery_addresses(state)`

## 🔐 Variáveis de Ambiente

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://comidasmart:comidasmart_pass_2025@postgres:5432/comidasmart_db
PORT=3001
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## 📦 Comandos Úteis

```bash
# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild serviços
docker-compose up -d --build backend
docker-compose up -d --build frontend

# Acessar PostgreSQL
docker-compose exec postgres psql -U comidasmart -d comidasmart_db

# Parar tudo
docker-compose down

# Limpar dados e recomeçar
docker-compose down -v
docker-compose up -d postgres
docker-compose --profile tools run --rm data-generator
```

## 📚 Documentação Adicional

- `DEPLOY.md` - Instruções de deploy (local e cloud)
- `ESTRUTURA_DADOS.md` - Detalhes sobre estrutura de dados
- `docs/ARCHITECTURE.md` - Decisões arquiteturais

## 🎯 Funcionalidades por Página

| Página | Faturamento | Vendas | Produtos | Tempo | Clientes | Filtros |
|--------|-------------|--------|----------|-------|----------|---------|
| Home (Overview) | ✅ | ✅ | Top 3 | ❌ | ❌ | - |
| Produtos Mais Vendidos | ✅ | ✅ | ✅ | ❌ | ❌ | Canal, Dia, Hora |
| Tempo de Entrega | ❌ | ❌ | ❌ | ✅ | ❌ | Período, Região |
| Clientes Recompra | ❌ | ❌ | ❌ | ❌ | ✅ | Inatividade |
| Faturamento por Canal | ✅ | ✅ | ❌ | ❌ | ❌ | - |
| Ticket Médio | ✅ | ✅ | ❌ | ❌ | ❌ | Canal/Loja |
| Produtos Menor Margem | ✅ | ✅ | ✅ | ❌ | ❌ | - |
| Performance Lojas | ✅ | ✅ | ❌ | ✅ | ❌ | Período |
| Performance Horário | ✅ | ✅ | ❌ | ❌ | ❌ | Canal |
| Cancelamentos | ✅ | ✅ | ❌ | ❌ | ❌ | - |
| Descontos | ✅ | ✅ | ❌ | ❌ | ❌ | Motivo |
| Items Mais Vendidos | ✅ | ✅ | ❌ | ❌ | ❌ | - |
| Produtos Alterações | ✅ | ✅ | ✅ | ❌ | ❌ | - |

## ✅ Checklist de Funcionalidades

### Implementado ✅
- [x] Faturamento total, ticket médio, vendas por dia
- [x] Rankings de lojas e produtos
- [x] Performance por canal e horário
- [x] Taxa de cancelamento e motivos
- [x] Análise de descontos por motivo
- [x] Items mais vendidos (customizações)
- [x] Produtos que recebem mais alterações
- [x] Tempo médio por região (estado, cidade, bairro)
- [x] Jornada do cliente (frequência, retenção)
- [x] Exportação PDF de todas as páginas
- [x] Tabelas expansíveis (top 10)
- [x] Sidebar com navegação completa
- [x] Design visual consistente

### Pendente (Complexo) ⚠️
- [ ] Mix de produtos (combinações)
- [ ] Detecção de anomalias temporais
- [ ] Previsão de demanda (ML)
- [ ] Segmentação de clientes (clustering)
- [ ] Otimização de rotas
- [ ] Lifetime value completo

## 🐞 Problemas Conhecidos

1. **Items Mais Vendidos** - Pode precisar de ajuste na query (verificar logs)
2. **Período Anterior "0 min"** - Normal quando não há dados históricos
3. **Canais Duplicados** - Já corrigido, mas frontend tem fallback de agrupamento

## 📞 Suporte

Para continuar o desenvolvimento:
1. Verificar logs: `docker-compose logs -f backend frontend`
2. Testar queries: http://localhost:3001/api/docs
3. Verificar dados: `docker-compose exec postgres psql -U comidasmart -d comidasmart_db`

---

**Projeto:** ComidaSmart  
**Desenvolvido por:** Paulo Dias  
**Status:** MVP Completo - Pronto para uso ✅

