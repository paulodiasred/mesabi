# 🧪 Guia de Testes - ComidaSmart Backend

Este documento descreve como executar e escrever testes para o backend do ComidaSmart.

## 📋 Estrutura de Testes

### Testes Unitários
- **Localização**: `src/**/*.spec.ts`
- **Foco**: Testar componentes individuais isoladamente
- **Exemplos**: `query.service.spec.ts`, `query.controller.spec.ts`

### Testes E2E (End-to-End)
- **Localização**: `test/**/*.e2e-spec.ts`
- **Foco**: Testar fluxos completos da aplicação
- **Exemplos**: `app.e2e-spec.ts`

## 🚀 Executando Testes

### Todos os testes
```bash
cd backend
npm test
```

### Testes em modo watch (desenvolvimento)
```bash
npm run test:watch
```

### Testes com cobertura
```bash
npm run test:cov
```

### Testes E2E
```bash
npm run test:e2e
```

## 📊 Cobertura de Código

Após executar `npm run test:cov`, você encontrará:
- Relatório HTML: `coverage/index.html`
- Relatório LCOV: `coverage/lcov.info`

## ✍️ Escrevendo Novos Testes

### Exemplo: Teste Unitário

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SeuService } from './seu.service';

describe('SeuService', () => {
  let service: SeuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeuService],
    }).compile();

    service = module.get<SeuService>(SeuService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve executar uma ação específica', async () => {
    const result = await service.acao();
    expect(result).toBeDefined();
  });
});
```

### Exemplo: Teste E2E

```typescript
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app/app.module';

describe('Endpoint (e2e)', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/endpoint (GET)', () => {
    return request(app.getHttpServer())
      .get('/endpoint')
      .expect(200);
  });
});
```

## 🎯 Testes Implementados

### QueryService
- ✅ Execução de queries simples
- ✅ Queries com dimensões
- ✅ Queries com filtros de data
- ✅ Queries com ORDER BY
- ✅ Tratamento de erros
- ✅ Validação de limites
- ✅ Processamento de BigInt

### QueryController
- ✅ Execução de queries via endpoint
- ✅ Endpoint de combinações de produtos
- ✅ Aplicação de filtros

### PrismaService
- ✅ Inicialização do serviço

## 📝 Boas Práticas

1. **Isolamento**: Cada teste deve ser independente
2. **Mocks**: Use mocks para dependências externas (banco, APIs)
3. **Arrange-Act-Assert**: Organize seus testes nessa estrutura
4. **Nomes descritivos**: Use nomes que descrevam o que está sendo testado
5. **Cobertura**: Procure manter alta cobertura nos componentes críticos

## 🔧 Configuração

A configuração do Jest está em `package.json`. Para ajustar:
- `testRegex`: Padrão de arquivos de teste
- `coverageDirectory`: Onde salvar relatórios de cobertura
- `collectCoverageFrom`: Quais arquivos incluir na cobertura

## 🐛 Troubleshooting

### Erro: "Cannot find module"
- Verifique se todas as dependências estão instaladas: `npm install`
- Verifique os imports nos arquivos de teste

### Erro: "Database connection failed"
- Testes unitários não devem conectar ao banco real
- Use mocks para PrismaService
- Testes E2E podem precisar de um banco de teste

### Testes lentos
- Use `jest --maxWorkers=4` para paralelizar
- Evite testes que dependem de operações I/O reais

