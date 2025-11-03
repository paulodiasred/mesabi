# 📤 Como Subir o ComidaSmart para um Repositório Git

## Passos Rápidos

### 1. Inicializar Git (se ainda não foi inicializado)
```bash
cd mesabi
git init
```

### 2. Adicionar arquivos
```bash
# Ver o que será adicionado
git status

# Adicionar tudo
git add .

# Ver o que está sendo commitado
git status
```

### 3. Commit inicial
```bash
git commit -m "feat: ComidaSmart MVP - Plataforma completa de analytics para restaurantes

- 12 páginas de análises funcionais
- Backend NestJS com query builder dinâmico
- Frontend Next.js com design moderno
- PostgreSQL com 6 meses de dados
- Exportação PDF em todas as páginas
- Deploy-ready com Docker Compose"
```

### 4. Criar repositório no GitHub/GitLab

**No GitHub:**
1. Acesse https://github.com/new
2. Nome: `comidasmart` ou `comidasmart-analytics`
3. Descrição: "🍽️ Plataforma de analytics plug-and-play para restaurantes"
4. Público ou Privado
5. NÃO inicialize com README (já temos um)

### 5. Conectar e Push
```bash
# Adicionar remote
git remote add origin https://github.com/SEU_USUARIO/comidasmart.git

# OU se for SSH
git remote add origin git@github.com:SEU_USUARIO/comidasmart.git

# Primeiro push
git branch -M main
git push -u origin main
```

## ⚠️ Importante: Arquivos Ignorados

O `.gitignore` já está configurado para ignorar:
- ✅ `node_modules/` (dependências)
- ✅ `.env` e `.env.local` (variáveis sensíveis)
- ✅ `dist/`, `.next/` (build outputs)
- ✅ `postgres_data/` (dados do banco)

**NÃO commite:**
- ❌ Arquivos `.env` (criar `.env.example` depois)
- ❌ `node_modules/`
- ❌ Dados do banco (postgres_data/)

## 📝 Arquivos Importantes que Devem Estar no Repo

✅ **DEVEM estar:**
- `README.md` - Documentação principal
- `DEPLOY.md` - Instruções de deploy
- `ESTRUTURA_DADOS.md` - Estrutura de dados
- `docker-compose.yml` - Configuração Docker
- `generate_data.py` - Script de geração de dados
- `requirements.txt` - Dependências Python
- `Dockerfile.*` - Dockerfiles
- `database-schema.sql` - Schema do banco
- Todo código fonte (`backend/src/`, `frontend/app/`)
- `backend/prisma/schema.prisma`
- `package.json` de cada projeto
- `.gitignore` (obviamente!)

## 🔐 Arquivos Sensíveis

**NÃO** commite credenciais! Se precisar compartilhar variáveis de ambiente, crie arquivos `.env.example`:

### `backend/.env.example`
```env
DATABASE_URL=postgresql://usuario:senha@postgres:5432/comidasmart_db
PORT=3001
JWT_SECRET=seu-jwt-secret-aqui
FRONTEND_URL=http://localhost:3000
```

### `frontend/.env.local.example`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## 📋 Checklist Antes do Push

- [ ] `git status` não mostra arquivos sensíveis
- [ ] `.env` está no `.gitignore`
- [ ] `node_modules` não está sendo commitado
- [ ] README.md está completo
- [ ] Não tem credenciais hardcoded no código
- [ ] Docker compose está funcional
- [ ] Build funciona localmente

## 🚀 Após o Push

Adicione no README:
```markdown
## Como Usar

1. Clone o repositório
2. Siga as instruções em README.md
3. Deploy: Veja DEPLOY.md
```

## 📦 Tamanho Esperado do Repo

- **Código fonte:** ~5-10 MB
- **Documentação:** ~100 KB
- **Sem dados do banco:** muito menor!

## 🎯 Comandos Úteis

```bash
# Ver o que está sendo commitado
git status

# Ver tamanho dos arquivos
git ls-files | xargs du -h | sort -h

# Verificar se não tem dados sensíveis
git diff --cached

# Se precisar remover arquivos do cache mas manter localmente
git rm --cached arquivo.env
```

---

**Pronto para publicar!** 🎉

