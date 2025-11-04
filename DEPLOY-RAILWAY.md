# 🚂 Deploy no Railway - Guia Rápido

## ⚠️ Problema Comum: Railway detecta Dockerfile errado

Se você ver o erro: **"The executable `npm` could not be found"**, significa que o Railway está usando o Dockerfile da raiz (Python) em vez do do frontend/backend (Node.js).

## ✅ Solução Rápida

### 1. Verificar Configuração do Serviço no Railway

Para **Frontend**:
1. No Railway Dashboard → Seu serviço frontend → Settings
2. **Root Directory**: Deve ser `mesabi/frontend` (não `mesabi` ou vazio!)
3. **Build Settings**:
   - Se estiver usando Dockerfile, desmarque "Use Dockerfile"
   - Ou configure: Dockerfile Path = `mesabi/frontend/Dockerfile`
4. Railway usará Nixpacks automaticamente (detecta Node.js)

Para **Backend**:
1. No Railway Dashboard → Seu serviço backend → Settings
2. **Root Directory**: Deve ser `mesabi/backend` (não `mesabi` ou vazio!)
3. **Build Settings**:
   - Se estiver usando Dockerfile, desmarque "Use Dockerfile"
   - Ou configure: Dockerfile Path = `mesabi/backend/Dockerfile`

### 2. Forçar Nixpacks (Recomendado)

Se você não quiser usar Dockerfile, force o Nixpacks:

1. Settings → Build
2. Desmarque "Use Dockerfile"
3. Railway detectará automaticamente:
   - `package.json` → Node.js
   - `next.config.js` → Next.js
   - `nest-cli.json` → NestJS

### 3. Verificar Arquivos

Os arquivos corretos devem estar assim:
- ✅ `mesabi/frontend/Dockerfile` - Para frontend (opcional)
- ✅ `mesabi/backend/Dockerfile` - Para backend (opcional)
- ✅ `mesabi/Dockerfile.data-generator` - Para gerador de dados (não usado no deploy)

## 🔧 Configuração Manual no Railway

### Frontend
```
Root Directory: mesabi/frontend
Build Command: npm ci && npm run build
Start Command: npm start
Environment: Production
```

### Backend
```
Root Directory: mesabi/backend
Build Command: npm ci && npm run build && npx prisma generate
Start Command: npm run start:prod
Environment: Production
```

## 🐛 Troubleshooting

### Erro: "npm not found"
- ✅ Verifique Root Directory (deve ser `mesabi/frontend` ou `mesabi/backend`)
- ✅ Desmarque "Use Dockerfile" se estiver usando o da raiz
- ✅ Force Nixpacks builder

### Erro: "Cannot find module"
- ✅ Verifique se o build command está correto
- ✅ Verifique se todas as dependências estão no `package.json`

### Build funciona mas app não inicia
- ✅ Verifique Start Command
- ✅ Verifique variáveis de ambiente
- ✅ Veja os logs no Railway Dashboard

## 📝 Checklist

- [ ] Root Directory configurado corretamente
- [ ] Dockerfile desmarcado OU apontando para o correto
- [ ] Build Command configurado
- [ ] Start Command configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Porta configurada (Railway detecta automaticamente)

---

**Dica**: Se ainda não funcionar, delete o serviço e recrie com as configurações corretas desde o início.

