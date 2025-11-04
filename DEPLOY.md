# 🚀 Deploy - ComidaSmart

Guia completo para deploy do projeto em diferentes plataformas cloud.

## 📋 Índice

- [Deploy Rápido (Local)](#-deploy-rápido-docker-compose---local)
- [Deploy em Cloud](#-deploy-em-produção-cloud)
  - [Railway.app (Recomendado)](#opção-1-railwayapp-recomendado-)
  - [Render.com](#opção-2-rendercom-gratuito)
  - [Vercel + Railway](#opção-3-vercel-frontend--railway-backend)
  - [AWS/Azure/GCP (Docker)](#opção-4-awsazuregcp-docker)
- [Configuração](#-configuração)
- [Checklist](#-checklist-de-deploy)
- [Troubleshooting](#-troubleshooting)

---

## ⚡ Deploy Rápido (Docker Compose - Local)

### Pré-requisitos
- Docker e Docker Compose instalados
- Portas 3000, 3001, 5432 disponíveis

### Passos

1. **Clone o repositório** (se necessário):
```bash
git clone <repo-url>
cd mesabi
```

2. **Suba os serviços**:
```bash
docker-compose up -d --build
```

3. **Execute as migrations** (primeira vez):
```bash
# Opção 1: Usar Prisma (recomendado)
docker exec -it comidasmart-backend sh
npx prisma migrate deploy
exit

# Opção 2: Executar SQL manualmente
docker exec -i comidasmart-postgres psql -U comidasmart -d comidasmart_db < database-schema.sql
```

4. **Gerar dados** (opcional):
```bash
# Opção 1: Gerar 6 meses de dados (recomendado - ~500k vendas)
docker-compose up data-generator

# Opção 2: Executar seed simples (~50 vendas)
docker exec -it comidasmart-backend sh
npm run prisma:seed
exit

# Opção 3: Usar Prisma Studio para inserir dados manualmente
docker exec -it comidasmart-backend sh
npx prisma studio
```

5. **Acessar**:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Swagger Docs**: http://localhost:3001/api/docs
- **Prisma Studio**: `npx prisma studio` (dentro do container)

---

## 🌐 Deploy em Produção (Cloud)

> **Nota**: Este projeto requer 3 serviços: Frontend (Next.js), Backend (NestJS) e PostgreSQL.
> 
> **Recomendação**: Para começar rapidamente, use **Railway.app** ou **Render.com** (ambos têm free tier).

---

## 🚀 Opções de Deploy

### Opção 1: Railway.app (Recomendado ⭐)

**Vantagens:**
- ✅ Deploy automático via Git
- ✅ PostgreSQL gerenciado incluso
- ✅ HTTPS automático
- ✅ Free tier generoso ($5 grátis/mês)
- ✅ Deploy de múltiplos serviços no mesmo projeto
- ✅ Logs centralizados

**Passos Detalhados**:

#### 1. Criar Conta e Projeto
1. Acesse https://railway.app e crie uma conta (GitHub login recomendado)
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Selecione seu repositório

#### 2. Adicionar PostgreSQL
1. No projeto, clique em "New" → "Database" → "PostgreSQL"
2. Railway criará automaticamente um banco PostgreSQL
3. Clique no banco → "Variables" → Copie o `DATABASE_URL`

#### 3. Deploy Backend
1. No projeto, clique em "New" → "GitHub Repo" (selecione o mesmo repo)
2. **IMPORTANTE**: Nas configurações do serviço:
   - **Root Directory**: `mesabi/backend` ⚠️ **CRÍTICO**: Deve ser exatamente isso
   - **Build Command**: `npm ci && npm run build && npx prisma generate`
   - **Start Command**: `npm run start:prod`
   - **Port**: Railway detecta automaticamente (pode deixar vazio)
   - **Dockerfile**: Railway deve usar `mesabi/backend/Dockerfile` OU usar Nixpacks (desmarque "Use Dockerfile" se houver problema)
3. **Variáveis de Ambiente** (Settings → Variables):
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://<seu-frontend-url>.railway.app
   ```
4. **Deploy**: Railway fará deploy automático após o push

#### 4. Executar Migrations (Primeira vez)
1. No serviço do backend, clique em "Deployments"
2. Clique no último deployment → "View Logs"
3. Ou use o Railway CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   railway link
   railway run npx prisma migrate deploy
   ```

#### 5. Deploy Frontend
1. No projeto, clique em "New" → "GitHub Repo" (selecione o mesmo repo)
2. **IMPORTANTE**: Nas configurações do serviço:
   - **Root Directory**: `mesabi/frontend` ⚠️ **CRÍTICO**: Deve ser exatamente isso
   - **Build Command**: `npm ci && npm run build` (ou deixe vazio, Railway detecta automaticamente)
   - **Start Command**: `npm start` (ou deixe vazio)
   - **Dockerfile Path**: Se Railway detectar Dockerfile, verifique se está usando `mesabi/frontend/Dockerfile` (não o da raiz!)
3. **Variáveis de Ambiente** (Settings → Variables):
   ```env
   NEXT_PUBLIC_API_URL=https://<backend-url>.railway.app/api/v1
   NODE_ENV=production
   ```
4. **Domínios**: Em Settings → Domains, Railway gerará um domínio HTTPS automático

**⚠️ Problema Comum**: Se Railway detectar o Dockerfile da raiz (Python), force o uso do Nixpacks:
   - Em Settings → Build, desmarque "Use Dockerfile"
   - Ou renomeie o Dockerfile da raiz para `Dockerfile.data-generator` (já feito)

#### 6. Gerar Dados (Opcional)
```bash
# Via Railway CLI ou container temporário
railway run python generate_data.py
```

---

### Opção 2: Render.com (Gratuito)

**Vantagens:**
- ✅ 750 horas grátis/mês (suficiente para 1 serviço 24/7)
- ✅ PostgreSQL free tier
- ✅ Auto-deploy do GitHub
- ✅ HTTPS automático

**Limitações:**
- ⚠️ Free tier "spins down" após 15min de inatividade (primeiro request pode ser lento)
- ⚠️ Um serviço por vez no free tier (pode precisar de 2 contas ou upgrade)

**Passos Detalhados**:

#### 1. Criar Conta
1. Acesse https://render.com e crie uma conta (GitHub login)

#### 2. Criar PostgreSQL
1. Dashboard → "New" → "PostgreSQL"
2. Configure:
   - **Name**: `comidasmart-db`
   - **Database**: `comidasmart_db`
   - **User**: `comidasmart`
   - **Region**: Escolha o mais próximo (ex: Oregon)
3. **Anote as credenciais** (ou use o `Internal Database URL`)

#### 3. Deploy Backend
1. Dashboard → "New" → "Web Service"
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `comidasmart-backend`
   - **Root Directory**: `mesabi/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build && npx prisma generate`
   - **Start Command**: `npm run start:prod`
   - **Instance Type**: `Free` (ou upgrade se necessário)
4. **Variáveis de Ambiente**:
   ```env
   DATABASE_URL=<sua-database-url-do-render>
   PORT=10000
   NODE_ENV=production
   FRONTEND_URL=https://<seu-frontend>.onrender.com
   ```
5. **Health Check Path**: `/api/v1/health` (opcional, mas recomendado)

#### 4. Executar Migrations
Após o primeiro deploy, execute:
```bash
# Via Render Shell (Dashboard → seu serviço → Shell)
cd mesabi/backend
npx prisma migrate deploy
```

#### 5. Deploy Frontend
1. Dashboard → "New" → "Web Service" (mesmo repo)
2. Configure:
   - **Name**: `comidasmart-frontend`
   - **Root Directory**: `mesabi/frontend`
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
3. **Variáveis de Ambiente**:
   ```env
   NEXT_PUBLIC_API_URL=https://<seu-backend>.onrender.com/api/v1
   NODE_ENV=production
   ```

#### 6. Auto-Deploy
- Render detecta pushes para a branch `main` automaticamente
- Ou use o arquivo `render.yaml` na raiz do projeto para configuração como código

---

### Opção 3: Vercel (Frontend) + Railway (Backend) ⚡

**Vantagens:**
- ✅ Vercel: Otimização perfeita para Next.js (Edge Functions, CDN global)
- ✅ Railway: Backend + PostgreSQL em um só lugar
- ✅ Free tier generoso para ambos
- ✅ Performance superior para Next.js

**Limitações:**
- ⚠️ Precisa configurar CORS no backend para o domínio do Vercel

**Passos Detalhados**:

#### 1. Deploy Backend no Railway
Siga os passos da **Opção 1** acima para deploy do backend.

**Importante**: Configure CORS no backend para aceitar o domínio do Vercel:
```typescript
// backend/src/main.ts
app.enableCors({
  origin: [
    'https://<seu-app>.vercel.app',
    'http://localhost:3000', // Para desenvolvimento
  ],
  credentials: true,
});
```

#### 2. Deploy Frontend no Vercel

**Opção A: Via Dashboard (Recomendado)**
1. Acesse https://vercel.com e crie uma conta (GitHub login)
2. Clique em "Add New Project"
3. Importe seu repositório GitHub
4. Configure:
   - **Framework Preset**: Next.js (detecta automaticamente)
   - **Root Directory**: `mesabi/frontend`
   - **Build Command**: `npm run build` (ou deixe padrão)
   - **Output Directory**: `.next` (ou deixe padrão)
5. **Environment Variables**:
   ```env
   NEXT_PUBLIC_API_URL=https://<seu-backend>.railway.app/api/v1
   ```
6. Clique em "Deploy"

**Opção B: Via CLI**
```bash
# Instalar Vercel CLI
npm i -g vercel

# No diretório do frontend
cd mesabi/frontend
vercel

# Seguir as instruções interativas:
# - Link to existing project? No (primeira vez)
# - Project name: comidasmart-frontend
# - Directory: ./
# - Override settings? No
```

#### 3. Configurar Domínio Customizado (Opcional)
1. No Vercel Dashboard → Settings → Domains
2. Adicione seu domínio personalizado
3. Siga as instruções de DNS

---

### Opção 4: AWS/Azure/GCP (Docker)

Para deploy em cloud providers tradicionais usando Docker:

#### AWS (ECS/Fargate)

**Pré-requisitos:**
- AWS CLI configurado
- Docker instalado
- ECR (Elastic Container Registry) criado

**Passos**:
```bash
# 1. Build e push das imagens
cd mesabi/backend
docker build -t comidasmart-backend .
docker tag comidasmart-backend:latest <aws-account>.dkr.ecr.<region>.amazonaws.com/comidasmart-backend:latest
aws ecr get-login-password | docker login --username AWS --password-stdin <aws-account>.dkr.ecr.<region>.amazonaws.com
docker push <aws-account>.dkr.ecr.<region>.amazonaws.com/comidasmart-backend:latest

# 2. Criar ECS Task Definition e Service
# 3. Configurar RDS PostgreSQL
# 4. Configurar Application Load Balancer
```

#### Azure (Container Instances)

```bash
# 1. Criar Azure Container Registry
az acr create --resource-group <rg> --name <registry> --sku Basic

# 2. Build e push
az acr build --registry <registry> --image comidasmart-backend:latest ./backend

# 3. Criar Container Instance
az container create \
  --resource-group <rg> \
  --name comidasmart-backend \
  --image <registry>.azurecr.io/comidasmart-backend:latest \
  --registry-login-server <registry>.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --dns-name-label <dns-name> \
  --ports 3001
```

#### Google Cloud Platform (Cloud Run)

```bash
# 1. Configurar projeto
gcloud config set project <project-id>

# 2. Build e push
cd mesabi/backend
gcloud builds submit --tag gcr.io/<project-id>/comidasmart-backend

# 3. Deploy no Cloud Run
gcloud run deploy comidasmart-backend \
  --image gcr.io/<project-id>/comidasmart-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=<postgres-url>,PORT=8080
```

---

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend
```env
# Obrigatórias
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=3001
NODE_ENV=production

# Opcionais (mas recomendadas)
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=your-secret-key-here-change-in-production
CORS_ORIGIN=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

#### Frontend
```env
# Obrigatória
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1

# Opcional
NODE_ENV=production
```

### Configurar CORS no Backend

Edite `backend/src/main.ts`:
```typescript
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000'];

app.enableCors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Health Checks

Ambos os serviços devem ter endpoints de health check:

**Backend** (`/api/v1/health`):
```typescript
@Get('health')
health() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

**Frontend**: Next.js tem health check automático em `/api/health` (se criar).

### Configurar PostgreSQL

**Após criar o banco na cloud:**
1. Execute as migrations:
   ```bash
   npx prisma migrate deploy
   ```
2. (Opcional) Popule com dados:
   ```bash
   python generate_data.py
   ```

---

## 📝 Checklist de Deploy

### Pré-Deploy
- [ ] Repositório no GitHub/GitLab configurado
- [ ] `.env.example` criado (sem secrets)
- [ ] Dockerfiles revisados e testados localmente
- [ ] README atualizado com instruções
- [ ] Testes passando (`npm test`)

### Deploy Backend
- [ ] PostgreSQL criado e acessível
- [ ] `DATABASE_URL` configurado corretamente
- [ ] Migrations executadas (`prisma migrate deploy`)
- [ ] Health check respondendo (`/api/v1/health`)
- [ ] Swagger acessível (`/api/docs`)
- [ ] CORS configurado para o domínio do frontend
- [ ] Logs funcionando e sem erros críticos

### Deploy Frontend
- [ ] Build sem erros (`npm run build`)
- [ ] `NEXT_PUBLIC_API_URL` configurado corretamente
- [ ] API conectando (testar no navegador)
- [ ] Assets carregando (logo, imagens)
- [ ] Sem erros no console do navegador
- [ ] Páginas principais carregando corretamente

### Pós-Deploy
- [ ] HTTPS habilitado e funcionando
- [ ] Domínio customizado configurado (opcional)
- [ ] Monitoramento ativo (logs, métricas)
- [ ] Backup do banco configurado (automático na maioria das plataformas)
- [ ] Testes de smoke básicos passando
- [ ] Documentação de acesso atualizada

---

## 🐛 Troubleshooting

### Problemas Comuns

### Backend não conecta ao PostgreSQL
```bash
# Verificar logs
docker logs comidasmart-backend

# Testar conexão manualmente
docker exec -it comidasmart-backend sh
psql $DATABASE_URL
```

**Soluções**:
- Verificar `DATABASE_URL` (sem espaços extras)
- Checar firewall/network
- Confirmar credenciais

### Frontend não carrega dados
```bash
# Ver logs do navegador
F12 → Console

# Verificar se API responde
curl https://your-backend-url/api/v1/health
```

**Soluções**:
- Verificar `NEXT_PUBLIC_API_URL`
- Checar CORS no backend
- Ver se API está online

### Build falha
```bash
# Ver logs completos
docker-compose logs backend --tail=100
```

**Soluções**:
- Limpar cache: `docker-compose down -v`
- Rebuild: `docker-compose build --no-cache`
- Confirmar Node.js 20+

### "Module not found" no Frontend
**Solução**: Verificar se todas as dependências estão no `package.json`:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erro "Prisma Client not generated"
**Solução**: Adicionar ao build command do backend:
```bash
npm ci && npm run build && npx prisma generate
```

### CORS Error no Frontend
**Solução**: Verificar configuração de CORS no backend:
1. Verificar `CORS_ORIGIN` ou `FRONTEND_URL` nas variáveis de ambiente
2. Verificar `main.ts` do backend
3. Testar com `curl`:
   ```bash
   curl -H "Origin: https://seu-frontend.com" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        https://seu-backend.com/api/v1/health
   ```

### Build Timeout (Render/Railway)
**Solução**: 
- Verificar se não está instalando dependências desnecessárias
- Usar `npm ci` em vez de `npm install`
- Verificar se não está fazendo build de dependências pesadas
- Considerar usar cache de build (Railway tem automático)

### Erro "Database connection failed"
**Solução**:
1. Verificar `DATABASE_URL` (sem espaços, sem quebras de linha)
2. Verificar se o banco está acessível (firewall, rede)
3. Testar conexão manualmente:
   ```bash
   psql $DATABASE_URL
   ```
4. Verificar se o Prisma está conectando:
   ```bash
   npx prisma db pull
   ```

### Frontend mostra "API Error" ou dados vazios
**Solução**:
1. Verificar `NEXT_PUBLIC_API_URL` (deve começar com `https://` em produção)
2. Abrir DevTools (F12) → Network → Verificar requisições
3. Verificar se o backend está respondendo:
   ```bash
   curl https://seu-backend.com/api/v1/health
   ```
4. Verificar CORS no backend

---

## 📊 Monitoramento (Opcional)

Recomendado para produção:

### Sentry (Erros)
```bash
npm install @sentry/nextjs @sentry/node
```

### LogRocket (Sessões)
```bash
npm install logrocket
```

### DataDog (Performance)
```bash
# Adicionar via variável de ambiente
DD_API_KEY=your-key
```

---

## 🔐 Segurança

### Checklist de Segurança
- [ ] Secrets em variáveis de ambiente (nunca commitados)
- [ ] HTTPS forçado
- [ ] CORS restrito para domínios conhecidos
- [ ] Rate limiting ativo
- [ ] SQL injection protegido (usar Prisma)
- [ ] XSS protegido (Next.js escapa por padrão)

### Exemplo de CORS restrito (Backend)
```typescript
// src/main.ts
app.enableCors({
  origin: ['https://comidasmart.com', 'https://www.comidasmart.com'],
  credentials: true,
});
```

---

## 💰 Custos Estimados

### Railway
- **Backend**: $5-10/mês
- **Frontend**: $5-10/mês
- **PostgreSQL**: $5/mês
- **Total**: ~$15-25/mês

### Render
- **Backend**: Gratuito (750h/mês)
- **Frontend**: Gratuito (750h/mês)
- **PostgreSQL**: Gratuito
- **Total**: $0/mês (se dentro das horas gratuitas)

### Vercel + Railway
- **Vercel**: Gratuito para Next.js
- **Railway Backend**: $5-10/mês
- **Railway PostgreSQL**: $5/mês
- **Total**: ~$10-15/mês

---

## 📚 Recursos Adicionais

### Documentação das Plataformas
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [AWS ECS Docs](https://docs.aws.amazon.com/ecs)

### Tutoriais Recomendados
- [Deploy Next.js na Vercel](https://vercel.com/docs/getting-started)
- [Deploy NestJS no Railway](https://docs.railway.app/guides/nestjs)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/current/admin.html)

---

## 🎯 Recomendações por Caso de Uso

### 🚀 Para Começar Rápido (Recomendado)
**Use Railway.app** - Setup mais simples, tudo em um lugar

### 💰 Para Orçamento Zero
**Use Render.com** - Free tier generoso, mas pode ter "cold starts"

### ⚡ Para Máxima Performance Next.js
**Use Vercel (Frontend) + Railway (Backend)** - Melhor dos dois mundos

### 🏢 Para Empresas/Produção Crítica
**Use AWS/Azure/GCP** - Mais controle, mais configuração necessária

---

**Pronto para deploy! 🚀**

**Dúvidas ou problemas?** 
- Verifique os logs na plataforma escolhida
- Revise este guia de troubleshooting
- Consulte a documentação da plataforma
- Abra uma issue no GitHub se necessário

**Boa sorte com o deploy! 🎉**
