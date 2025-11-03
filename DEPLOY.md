# 🚀 Deploy - ComidaSmart

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

### Opção 1: Railway.app (Recomendado ⭐)

**Por quê?**
- Deploy automático via Git
- PostgreSQL gerenciado incluso
- HTTPS automático
- Free tier generoso

**Passos**:
1. Criar conta em https://railway.app
2. Criar novo projeto "ComidaSmart"
3. **Adicionar PostgreSQL**:
   - Clique em "New" → "Database" → "PostgreSQL"
   - Anote as credenciais (DATABASE_URL)
4. **Deploy Backend**:
   - Clique em "New" → "GitHub Repo"
   - Selecione o repositório
   - Set root directory: `mesabi/backend`
   - Build command: `npm ci && npm run build`
   - Start command: `node dist/main`
   - Port: 3001
5. **Variáveis de Ambiente (Backend)**:
   ```env
   DATABASE_URL=<railway-postgres-url>
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://<your-domain>.railway.app
   ```
6. **Deploy Frontend**:
   - Clique em "New" → "GitHub Repo" (mesmo repositório)
   - Set root directory: `mesabi/frontend`
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Port: 3000
7. **Variáveis de Ambiente (Frontend)**:
   ```env
   NEXT_PUBLIC_API_URL=https://<backend-url>/api/v1
   ```

---

### Opção 2: Render.com (Gratuito)

**Por quê?**
- 750 horas grátis/mês
- PostgreSQL free tier
- Auto-deploy do GitHub

**Passos**:
1. Criar conta em https://render.com
2. **Criar PostgreSQL Database**:
   - Dashboard → "New" → "PostgreSQL"
   - Database name: `comidasmart_db`
3. **Deploy Backend**:
   - "New" → "Web Service"
   - Conecte ao GitHub e selecione o repo
   - Root directory: `mesabi/backend`
   - Build command: `npm ci && npm run build`
   - Start command: `node dist/main`
4. **Variáveis de Ambiente (Backend)**:
   ```env
   DATABASE_URL=<render-postgres-url>
   PORT=10000
   NODE_ENV=production
   FRONTEND_URL=https://<your-app>.onrender.com
   ```
5. **Deploy Frontend**:
   - "New" → "Web Service" (mesmo repo)
   - Root directory: `mesabi/frontend`
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
6. **Variáveis de Ambiente (Frontend)**:
   ```env
   NEXT_PUBLIC_API_URL=https://<backend-url>/api/v1
   ```

---

### Opção 3: Vercel (Frontend) + Railway (Backend)

**Por quê?**
- Vercel: Otimização perfeita para Next.js
- Railway: Backend + PostgreSQL

**Passos**:

**1. Deploy Backend no Railway** (seguir Opção 1 acima)

**2. Deploy Frontend no Vercel**:
```bash
# Instalar Vercel CLI
npm i -g vercel

# No diretório do frontend
cd mesabi/frontend
vercel

# Seguir as instruções interativas
```

**Variáveis de Ambiente (Vercel)**:
```env
NEXT_PUBLIC_API_URL=https://<railway-backend-url>/api/v1
```

---

## 🔧 Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key-here
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api/v1
```

---

## 📝 Checklist de Deploy

### Antes do Deploy
- [ ] Repositório no GitHub/GitLab
- [ ] Dockerfiles revisados
- [ ] `.env.example` criado (sem secrets)
- [ ] README atualizado

### Deploy Backend
- [ ] PostgreSQL criado e funcionando
- [ ] Migrations executadas
- [ ] Variáveis de ambiente configuradas
- [ ] Health check passando
- [ ] Swagger acessível

### Deploy Frontend
- [ ] Build sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] API conectando corretamente
- [ ] Assets carregando (logo, etc)
- [ ] Sem erros no console

### Pós-Deploy
- [ ] HTTPS habilitado
- [ ] CORS configurado
- [ ] Testes básicos passando
- [ ] Monitoramento ativo (opcional)

---

## 🐛 Troubleshooting

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
**Solução**: Adicionar ao `next.config.js`:
```js
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname),
  };
  return config;
},
```

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

**Pronto para deploy! 🚀**

**Dúvidas?** Abra uma issue no GitHub.
