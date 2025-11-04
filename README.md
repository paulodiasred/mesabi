# 🍽️ ComidaSmart - Analytics para Restaurantes

**Plataforma de analytics plug-and-play para restaurantes** - Sistema completo de análise de dados operacionais com interface moderna e API flexível.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack Tecnológica](#stack-tecnológica)
- [Decisões Arquiteturais](#decisões-arquiteturais)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Instalação e Configuração](#instalação-e-configuração)
- [Uso](#uso)
- [Funcionalidades](#funcionalidades)
- [API](#api)
- [Testes](#testes)
- [Deploy](#deploy)
- [Roadmap](#roadmap)

---

## 🎯 Visão Geral

O ComidaSmart é uma plataforma de analytics desenvolvida para restaurantes que precisam analisar dados operacionais de forma rápida e eficiente. O sistema oferece:

- **13 páginas de análises** cobrindo produtos, vendas, performance, entregas e clientes
- **API RESTful flexível** com query builder dinâmico
- **Interface moderna** com visualizações interativas
- **Escalabilidade** preparada para grandes volumes de dados
- **Modularidade** permitindo fácil extensão

### Objetivos Principais

1. **Performance**: Queries otimizadas para grandes volumes de dados (600k+ vendas)
2. **Flexibilidade**: Query builder que permite análises customizadas via API
3. **Usabilidade**: Interface intuitiva para não-técnicos
4. **Manutenibilidade**: Código organizado e testado

---

## 🏗️ Arquitetura

### Arquitetura Geral

O sistema segue uma **arquitetura de microsserviços modular** com separação clara entre frontend, backend e banco de dados:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Frontend      │◄───────►│   Backend       │◄───────►│   PostgreSQL    │
│   (Next.js)     │  HTTP   │   (NestJS)      │  SQL    │   (Database)    │
│   Port: 3000    │         │   Port: 3001    │         │   Port: 5432    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
       │                            │
       │                            │
       └──────────────┬─────────────┘
                      │
              ┌───────▼────────┐
              │  Docker Compose │
              │  (Orquestração) │
              └─────────────────┘
```

### Padrões Arquiteturais

1. **Backend (NestJS)**:
   - **Modular Architecture**: Cada funcionalidade é um módulo independente
   - **Dependency Injection**: Gerenciamento de dependências nativo
   - **Service Layer Pattern**: Lógica de negócio isolada em services
   - **Repository Pattern**: Prisma como camada de abstração do banco

2. **Frontend (Next.js)**:
   - **App Router**: Roteamento baseado em file-system
   - **Server Components**: Componentes que renderizam no servidor quando possível
   - **Client Components**: Interatividade onde necessário
   - **Component Composition**: Componentes reutilizáveis

3. **Database**:
   - **Relational Model**: PostgreSQL com normalização
   - **Indexes**: Otimização de queries frequentes
   - **Denormalização Seletiva**: Para performance quando necessário

---

## 🛠️ Stack Tecnológica

### Backend

| Tecnologia | Versão | Propósito | Por quê? |
|------------|--------|-----------|----------|
| **NestJS** | ^10.0.0 | Framework | TypeScript nativo, arquitetura modular, DI nativo |
| **Prisma** | ^5.7.0 | ORM | Type-safety, migrations automáticas, queries otimizadas |
| **PostgreSQL** | 15+ | Database | Relacional, ACID, JSON support, performance |
| **TypeScript** | ^5.1.3 | Linguagem | Type-safety, melhor DX, catch errors em compile-time |
| **Jest** | ^29.5.0 | Testing | Padrão NestJS, mocks fáceis, cobertura |
| **Swagger** | ^7.1.0 | Docs | Documentação automática da API |

### Frontend

| Tecnologia | Versão | Propósito | Por quê? |
|------------|--------|-----------|----------|
| **Next.js** | ^14.0.0 | Framework | SSR/SSG, App Router, performance, SEO |
| **React** | ^18.2.0 | UI Library | Componentização, ecossistema, performance |
| **TypeScript** | ^5.2.2 | Linguagem | Type-safety, melhor DX |
| **Tailwind CSS** | ^3.3.5 | Styling | Utility-first, rápido, consistente |
| **Recharts** | ^2.10.0 | Charts | React-native, flexível, performático |
| **Axios** | ^1.6.0 | HTTP Client | Interceptors, cancelamento, tipos |

### DevOps & Tools

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Docker** | latest | Containerização |
| **Docker Compose** | 3.8 | Orquestração local |
| **Python** | 3.9+ | Scripts de geração de dados |
| **Git** | - | Versionamento |

---

## 📐 Decisões Arquiteturais

### ADR-001: NestJS vs Express vs Fastify

**Decisão**: Usar NestJS como framework backend.

**Contexto**: 
- Precisávamos de um framework Node.js para construir a API REST
- Equipe com experiência em TypeScript
- Necessidade de arquitetura escalável e testável

**Alternativas Consideradas**:
1. **Express**: Mais simples, mais leve, mas menos estrutura
2. **Fastify**: Muito rápido, mas menos maduro e menor ecossistema
3. **NestJS**: Framework completo, TypeScript-first, arquitetura modular

**Decisão Final**: NestJS

**Razões**:
- ✅ **TypeScript nativo**: Melhor DX e type-safety
- ✅ **Arquitetura modular**: Fácil de escalar e manter
- ✅ **Dependency Injection**: Facilita testes e manutenção
- ✅ **Ecossistema**: Muitos módulos prontos (Swagger, Validation, etc.)
- ✅ **Padrões**: Força boas práticas (Services, Controllers, Modules)
- ✅ **Testabilidade**: Estrutura facilita testes unitários e E2E

**Trade-offs**:
- ❌ Curva de aprendizado maior que Express
- ❌ Mais verboso para projetos pequenos
- ✅ Mas o benefício vale a pena para projetos médios/grandes

---

### ADR-002: Prisma vs TypeORM vs Sequelize

**Decisão**: Usar Prisma como ORM.

**Contexto**: 
- Necessidade de ORM para trabalhar com PostgreSQL
- Type-safety é crítico
- Queries complexas de analytics

**Alternativas Consideradas**:
1. **TypeORM**: Mature, decorators, mas queries complexas são difíceis
2. **Sequelize**: Muito usado, mas menos type-safe
3. **Prisma**: Type-safe, migrations automáticas, queries otimizadas

**Decisão Final**: Prisma

**Razões**:
- ✅ **Type-safety completo**: Gera tipos TypeScript automaticamente
- ✅ **Migrations**: Sistema de migrations robusto e seguro
- ✅ **Prisma Studio**: UI para visualizar dados
- ✅ **Performance**: Queries otimizadas e conexão pooling
- ✅ **Raw SQL**: Suporte a `$queryRawUnsafe` para queries complexas (necessário para analytics)
- ✅ **Developer Experience**: Schema declarativo, IntelliSense completo

**Trade-offs**:
- ❌ Aprendizado do Prisma Schema
- ❌ Menos flexível que TypeORM para casos extremos
- ✅ Mas para 95% dos casos, Prisma é superior

**Nota**: Usamos `$queryRawUnsafe` para queries de analytics complexas que o Prisma não consegue gerar automaticamente. Isso é aceitável porque:
- Essas queries são otimizadas manualmente
- Type-safety é mantida no nível da aplicação (DTOs)
- Performance é crítica para analytics

---

### ADR-003: Next.js App Router vs Pages Router

**Decisão**: Usar Next.js 14 com App Router.

**Contexto**: 
- Next.js 14 introduziu o App Router como novo padrão
- Necessidade de SSR/SSG para performance

**Alternativas Consideradas**:
1. **Pages Router**: Estável, maduro, mas sendo descontinuado
2. **App Router**: Novo padrão, mais recursos, melhor performance

**Decisão Final**: App Router

**Razões**:
- ✅ **Futuro**: Pages Router será descontinuado
- ✅ **Server Components**: Melhor performance (render no servidor)
- ✅ **Layouts**: Sistema de layouts mais flexível
- ✅ **Loading States**: Built-in loading.tsx
- ✅ **Error Boundaries**: Error handling melhor
- ✅ **Metadata API**: SEO melhor integrado

**Trade-offs**:
- ❌ Mudanças recentes (alguns bugs podem existir)
- ❌ Menos exemplos na comunidade (ainda)
- ✅ Mas os benefícios superam os riscos

---

### ADR-004: PostgreSQL vs MongoDB vs MySQL

**Decisão**: Usar PostgreSQL como banco de dados.

**Contexto**: 
- Dados relacionais (vendas, produtos, clientes)
- Queries analíticas complexas
- Necessidade de ACID

**Alternativas Consideradas**:
1. **MongoDB**: NoSQL, mas não ideal para analytics relacionais
2. **MySQL**: Popular, mas PostgreSQL tem mais recursos
3. **PostgreSQL**: Relacional, JSON support, performance

**Decisão Final**: PostgreSQL

**Razões**:
- ✅ **ACID Compliance**: Garante integridade dos dados
- ✅ **Queries Complexas**: Suporta JOINs, window functions, CTEs
- ✅ **JSON Support**: Pode armazenar dados semi-estruturados se necessário
- ✅ **Performance**: Otimizado para analytics e queries complexas
- ✅ **Extensibilidade**: Extensões como PostGIS se necessário
- ✅ **Open Source**: Sem custos de licenciamento

**Trade-offs**:
- ❌ Setup um pouco mais complexo que MySQL
- ❌ Pode ser overkill para projetos muito pequenos
- ✅ Mas para analytics é a melhor escolha

---

### ADR-005: Query Builder Dinâmico vs Endpoints Específicos

**Decisão**: Implementar query builder dinâmico com endpoints específicos para casos especiais.

**Contexto**: 
- Necessidade de flexibilidade para análises customizadas
- Performance é crítica
- Manutenibilidade importante

**Alternativas Consideradas**:
1. **Endpoints Específicos**: Uma rota por análise (mais simples, menos flexível)
2. **Query Builder Dinâmico**: Uma rota genérica (mais flexível, mais complexo)
3. **Híbrido**: Query builder + endpoints específicos para casos especiais

**Decisão Final**: Híbrido

**Implementação**:
- `POST /api/v1/query/run`: Query builder genérico
- `GET /api/v1/query/product-combinations`: Endpoint específico otimizado

**Razões**:
- ✅ **Flexibilidade**: Query builder permite análises customizadas
- ✅ **Performance**: Endpoints específicos para queries complexas (como combinações)
- ✅ **Manutenibilidade**: Código mais organizado
- ✅ **Segurança**: Validação de inputs via DTOs
- ✅ **Extensibilidade**: Fácil adicionar novos endpoints

**Trade-offs**:
- ❌ Query builder é mais complexo de implementar
- ❌ Requer validação cuidadosa de inputs
- ✅ Mas oferece muito mais valor

**Exemplo de Query Builder**:
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
    { "field": "created_at", "op": ">=", "value": "2025-01-01" }
  ],
  "limit": 20
}
```

---

### ADR-006: Client-side vs Server-side Processing

**Decisão**: Processar no servidor sempre que possível, client-side apenas para UI.

**Contexto**: 
- Analytics requer processamento de grandes volumes
- Performance é crítica
- Experiência do usuário importante

**Alternativas Consideradas**:
1. **Client-side**: Processar tudo no frontend (sobrecarrega o navegador)
2. **Server-side**: Processar tudo no backend (melhor performance)

**Decisão Final**: Server-side com processamento client-side mínimo

**Razões**:
- ✅ **Performance**: Servidor é mais poderoso
- ✅ **Segurança**: Dados sensíveis não saem do servidor
- ✅ **Escalabilidade**: Pode cachear resultados no servidor
- ✅ **UX**: Respostas mais rápidas
- ✅ **Network**: Menos dados trafegados

**Onde fazemos client-side**:
- Formatação de dados para exibição
- Cálculos simples de UI (ex: porcentagens)
- Detecção de anomalias básica (pode ser movido para backend no futuro)

**Exceção**: Detecção de anomalias temporais foi implementada no frontend inicialmente para rapidez, mas pode ser movida para backend se necessário.

---

### ADR-007: Monorepo vs Multi-repo

**Decisão**: Usar monorepo (tudo em um repositório).

**Contexto**: 
- Frontend e backend compartilham tipos
- Deploy conjunto
- Manutenção simplificada

**Alternativas Consideradas**:
1. **Multi-repo**: Repositórios separados (mais isolamento)
2. **Monorepo**: Um repositório (mais fácil de manter)

**Decisão Final**: Monorepo

**Estrutura**:
```
mesabi/
├── backend/
├── frontend/
├── docker-compose.yml
└── package.json (root)
```

**Razões**:
- ✅ **Simplicidade**: Um repositório, um clone
- ✅ **Versionamento**: Versões sincronizadas
- ✅ **Scripts**: Scripts compartilhados no root
- ✅ **Deploy**: Deploy conjunto mais fácil
- ✅ **Tipos**: Fácil compartilhar tipos (se necessário)

**Trade-offs**:
- ❌ Repositório maior
- ❌ Mais cuidado com permissões se múltiplos times
- ✅ Mas para projetos pequenos/médios é ideal

---

### ADR-008: Docker Compose vs Kubernetes

**Decisão**: Docker Compose para desenvolvimento, Kubernetes para produção (futuro).

**Contexto**: 
- Facilidade de setup local
- Escalabilidade futura

**Decisão Final**: Docker Compose agora, Kubernetes quando necessário

**Razões**:
- ✅ **Simplicidade**: Docker Compose é suficiente para desenvolvimento
- ✅ **Rapidez**: Setup local rápido
- ✅ **Flexibilidade**: Kubernetes pode ser adicionado depois
- ✅ **Custo**: Não precisa de cluster para desenvolvimento

**Quando migrar para Kubernetes**:
- Quando precisar de auto-scaling
- Quando tiver múltiplos ambientes (dev, staging, prod)
- Quando precisar de alta disponibilidade

---

### ADR-009: Recharts vs Chart.js vs D3.js

**Decisão**: Usar Recharts para visualizações.

**Contexto**: 
- Necessidade de gráficos interativos
- React-native
- Performance

**Alternativas Consideradas**:
1. **Chart.js**: Popular, mas não React-native (requer wrappers)
2. **D3.js**: Muito poderoso, mas muito complexo para nossos casos
3. **Recharts**: React-native, simples, performático

**Decisão Final**: Recharts

**Razões**:
- ✅ **React-native**: Componentes React nativos
- ✅ **Simplicidade**: API simples e declarativa
- ✅ **Performance**: Otimizado para React
- ✅ **Customização**: Fácil customizar estilos
- ✅ **Documentação**: Boa documentação e exemplos

**Trade-offs**:
- ❌ Menos opções de gráficos que D3.js
- ❌ Menos controle fino que D3.js
- ✅ Mas para 95% dos casos é suficiente

---

## 📁 Estrutura do Projeto

```
mesabi/
├── backend/                    # API NestJS
│   ├── src/
│   │   └── app/
│   │       ├── modules/        # Módulos da aplicação
│   │       │   ├── query/      # Query builder dinâmico
│   │       │   │   ├── query.service.ts
│   │       │   │   ├── query.controller.ts
│   │       │   │   ├── query.service.spec.ts
│   │       │   │   └── dto/
│   │       │   ├── prisma/     # Serviço Prisma
│   │       │   ├── auth/       # Autenticação (JWT)
│   │       │   ├── dashboard/  # Dashboard endpoints
│   │       │   └── semantic/   # Queries semânticas
│   │       ├── common/         # Código compartilhado
│   │       │   ├── filters/    # Exception filters
│   │       │   └── interceptors/ # Cache, logging
│   │       ├── config/         # Configuração
│   │       └── app.module.ts   # Módulo raiz
│   ├── prisma/
│   │   └── schema.prisma       # Schema do banco
│   ├── test/                   # Testes E2E
│   └── package.json
│
├── frontend/                   # Next.js App
│   ├── app/
│   │   ├── analytics/          # Páginas de análises
│   │   │   ├── produtos/
│   │   │   ├── clientes/
│   │   │   ├── entrega/
│   │   │   ├── produtos-hub/   # Hub de produtos
│   │   │   ├── vendas-hub/     # Hub de vendas
│   │   │   └── ...
│   │   ├── dashboard/          # Dashboard principal
│   │   ├── layout.tsx          # Layout com sidebar
│   │   └── page.tsx            # Home page
│   ├── components/             # Componentes reutilizáveis
│   ├── lib/                    # Utilitários
│   └── package.json
│
├── docker-compose.yml          # Orquestração de serviços
├── generate_data.py            # Script de geração de dados
├── database-schema.sql         # Schema SQL inicial
├── package.json                # Scripts root
└── README.md                   # Este arquivo
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Docker** e **Docker Compose** instalados
- **Node.js** 18+ (para desenvolvimento local)
- **Python** 3.9+ (para gerar dados)
- Portas disponíveis: `3000` (frontend), `3001` (backend), `5432` (PostgreSQL)

### Instalação Rápida

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd mesabi
```

2. **Inicie o PostgreSQL**:
```bash
docker-compose up -d postgres
```

3. **Aguarde o banco inicializar** (verifique os logs):
```bash
docker-compose logs -f postgres
```

4. **Gere os dados** (isso pode levar 10-20 minutos):
```bash
docker-compose --profile tools run --rm data-generator
```

5. **Configure variáveis de ambiente**:

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://challenge:challenge_2024@localhost:5432/challenge_db
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

6. **Instale dependências**:
```bash
npm run install:all
```

7. **Inicie os serviços**:

**Opção A - Docker (Produção)**:
```bash
docker-compose up -d backend frontend
```

**Opção B - npm (Desenvolvimento - Recomendado)**:
```bash
npm run dev
```

Isso inicia backend e frontend simultaneamente usando `concurrently`.

8. **Acesse a aplicação**:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Swagger Docs**: http://localhost:3001/api/docs

---

## 📖 Uso

### Frontend

Acesse http://localhost:3000 e navegue pelas páginas de análises:

- **Home**: Dashboard geral com KPIs e gráficos temporais
- **Produtos**: Análises de produtos (mais vendidos, margem, mix)
- **Vendas & Operação**: Faturamento, ticket médio, descontos
- **Performance**: Performance de lojas e horários
- **Entrega**: Tempo de entrega por região
- **Clientes**: Clientes para recompra com LTV

### API

#### Query Builder

Execute queries dinâmicas via `POST /api/v1/query/run`:

```bash
curl -X POST http://localhost:3001/api/v1/query/run \
  -H "Content-Type: application/json" \
  -d '{
  "subject": "vendas",
  "measures": [
    { "name": "faturamento", "aggregation": "sum", "field": "total_amount" }
  ],
  "dimensions": [
    { "name": "Canal", "field": "channel_id" }
  ],
  "filters": [
      { "field": "created_at", "op": ">=", "value": "2025-01-01" }
  ],
  "limit": 20
  }'
```

#### Product Combinations

Obtenha combinações de produtos:
```bash
curl "http://localhost:3001/api/v1/query/product-combinations?minOccurrences=10&startDate=2025-01-01&endDate=2025-01-31"
```

---

## ✨ Funcionalidades

### 13 Páginas de Análises

1. **🍔 Produtos Mais Vendidos** - Rankings por canal, dia e horário
2. **🚚 Tempo de Entrega** - Por região (estado, cidade, bairro)
3. **👥 Clientes para Recompra** - Identificação de clientes inativos com LTV
4. **📊 Faturamento por Canal** - Distribuição de receita
5. **💰 Ticket Médio** - Comparação por canal/loja
6. **📉 Produtos com Menor Margem** - Análise de margem e lucro
7. **🏪 Performance das Lojas** - Comparação completa
8. **⏰ Performance por Horário** - Por hora do dia e dia da semana
9. **❌ Taxa de Cancelamento** - Monitoramento de cancelamentos
10. **🎁 Análise de Descontos** - Breakdown por motivo
11. **🔧 Items Mais Vendidos** - Complementos e customizações
12. **🔄 Produtos com Mais Alterações** - Produtos mais customizados
13. **🍽️ Mix de Produtos** - Associação de produtos (combinações)

### Funcionalidades Técnicas

- ✅ **Query Builder Dinâmico**: API flexível para análises customizadas
- ✅ **Cache**: Cache de queries frequentes (1 hora TTL)
- ✅ **Validação**: Validação de inputs via class-validator
- ✅ **Documentação**: Swagger automático
- ✅ **Testes**: Testes unitários e E2E
- ✅ **Exportação PDF**: Todas as páginas podem exportar PDF
- ✅ **Detecção de Anomalias**: Algoritmo básico de detecção de picos/quedas

---

## 🔌 API

### Endpoints Principais

#### `POST /api/v1/query/run`
Execute uma query dinâmica.

**Request Body**:
```typescript
{
  subject: 'vendas' | 'produtos' | 'items' | 'entregas' | 'clientes';
  measures: Array<{
    name: string;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count';
    field: string;
  }>;
  dimensions?: Array<{
    name: string;
    field: string;
    grouping?: string;
  }>;
  filters?: Array<{
    field: string;
    op: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'between' | 'in' | 'like' | 'contains';
    value: any;
  }>;
  timeRange?: {
    from: string;
    to: string;
  };
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number; // Máximo: 100000
}
```

**Response**:
```typescript
{
  data: Array<Record<string, any>>;
  metadata: {
    totalRows: number;
    executionTime: number;
    cached: boolean;
    sql: string;
  };
}
```

#### `GET /api/v1/query/product-combinations`
Obtenha combinações de produtos frequentemente comprados juntos.

**Query Parameters**:
- `minOccurrences` (opcional): Número mínimo de ocorrências (default: 1)
- `startDate` (opcional): Data inicial (YYYY-MM-DD)
- `endDate` (opcional): Data final (YYYY-MM-DD)

**Response**:
```typescript
{
  data: Array<{
    produto1_id: number;
    produto2_id: number;
    vezes_juntos: number;
    receita_total: number;
    ticket_medio: number;
  }>;
  metadata: {
    totalRows: number;
    executionTime: number;
    cached: boolean;
  };
}
```

### Documentação Completa

Acesse http://localhost:3001/api/docs para ver a documentação Swagger completa.

---

## 🧪 Testes

### Executando Testes

```bash
# Todos os testes
npm test

# Testes unitários (backend)
npm run test:backend

# Testes em modo watch (desenvolvimento)
npm run test:backend:watch

# Testes com cobertura
npm run test:backend:cov

# Testes E2E
npm run test:backend:e2e

# Todos os testes (unitários + E2E)
npm run test:all
```

### Cobertura

Após executar `npm run test:backend:cov`, veja o relatório em:
- HTML: `backend/coverage/index.html`
- LCOV: `backend/coverage/lcov.info`

### Estrutura de Testes

- **Unitários**: `*.spec.ts` - Testam componentes isolados
- **E2E**: `test/*.e2e-spec.ts` - Testam fluxos completos

### Testes Implementados

- ✅ `QueryService` - Query builder e processamento
- ✅ `QueryController` - Endpoints da API
- ✅ `QueryRequestDto` - Validação de DTOs
- ✅ `PrismaService` - Conexão com banco
- ✅ E2E - Endpoints principais

---

## 🚢 Deploy

### Desenvolvimento Local

Use `npm run dev` para desenvolvimento local com hot-reload.

### Produção com Docker

1. **Build das imagens**:
```bash
docker-compose build
```

2. **Inicie os serviços**:
```bash
docker-compose up -d
```

3. **Verifique os logs**:
```bash
docker-compose logs -f backend frontend
```

### Variáveis de Ambiente de Produção

**Backend**:
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=3001
JWT_SECRET=<strong-secret>
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

**Frontend**:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

### Deploy em Cloud

O projeto pode ser deployado em:
- **AWS**: ECS, EKS, Lambda
- **Google Cloud**: Cloud Run, GKE
- **Azure**: Container Instances, AKS
- **Vercel**: Frontend (Next.js)
- **Railway/Render**: Full-stack

Veja `DEPLOY.md` para instruções detalhadas.

---

## 🗺️ Roadmap

### ✅ Implementado (v1.0)

- [x] 13 páginas de análises
- [x] Query builder dinâmico
- [x] API RESTful completa
- [x] Interface moderna
- [x] Testes automatizados
- [x] Documentação Swagger
- [x] Exportação PDF
- [x] Detecção de anomalias básica
- [x] Lifetime Value (LTV)

### 🔄 Em Progresso

- [ ] Cache Redis para queries frequentes
- [ ] Autenticação e autorização completa
- [ ] Alertas e notificações

### 📅 Planejado (v2.0)

- [ ] Previsão de demanda (Machine Learning)
- [ ] Segmentação de clientes (Clustering)
- [ ] Otimização de rotas de entrega
- [ ] Recomendação de produtos
- [ ] Dashboard mobile
- [ ] Relatórios agendados por email
- [ ] Gráficos de calor e mapas geográficos

---

## 📊 Dados

### Geração de Dados

O script `generate_data.py` gera dados realistas:

- **50 lojas**
- **500 produtos**
- **200 items/complementos**
- **10.000 clientes**
- **~600k vendas** (6 meses)
- **~1.2M produtos vendidos**
- **~1M customizações**

### Padrões Realistas

- Distribuição temporal (horários de pico, dias da semana)
- Ticket médio por canal (Presencial ~R$50, iFood ~R$80, Rappi ~R$70)
- 60% das vendas têm customizações
- 5% taxa de cancelamento

### Anomalias Injetadas

Para testar detecção de anomalias:
- Semana problemática (30% queda)
- Dia promocional (3x pico)
- Loja crescendo (5% ao mês)
- Produtos sazonais (80% aumento em meses específicos)

---

## 🐛 Troubleshooting

### Problemas Comuns

1. **Porta já em uso**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill
```

2. **Banco não conecta**:
```bash
# Verifique se o PostgreSQL está rodando
docker-compose ps postgres

# Verifique os logs
docker-compose logs postgres
```

3. **Erro de dependências**:
```bash
# Reinstale as dependências
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install:all
```

4. **Erro de build**:
```bash
# Limpe os builds
rm -rf backend/dist frontend/.next
npm run build
```

---

## 📚 Documentação Adicional

- [`DEPLOY.md`](./DEPLOY.md) - Instruções de deploy
- [`ESTRUTURA_DADOS.md`](./ESTRUTURA_DADOS.md) - Estrutura de dados
- [`backend/README-TESTES.md`](./backend/README-TESTES.md) - Guia de testes
- [`DADOS.md`](./DADOS.md) - Detalhes sobre geração de dados

---

## 👥 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código

- **TypeScript**: Use types explícitos
- **Testes**: Escreva testes para novas funcionalidades
- **Commits**: Use commits semânticos (feat, fix, docs, etc.)
- **Lint**: Execute `npm run lint` antes de commitar

---

## 📄 Licença

Este projeto é privado e proprietário.

---

## 👨‍💻 Autor

**Paulo Dias**

- Desenvolvido como solução completa de analytics para restaurantes
- Arquitetura modular e escalável
- Foco em performance e usabilidade

---

## 🙏 Agradecimentos

- NestJS e Next.js pelas excelentes frameworks
- Prisma pela ferramenta de ORM
- Comunidade open-source por todas as bibliotecas utilizadas

---

**Última Atualização**: Dezembro 2025  
**Versão**: 1.0.0  
**Status**: ✅ MVP Completo - Pronto para uso
