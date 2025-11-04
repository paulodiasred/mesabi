import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { HttpExceptionFilter } from '../src/app/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    
    // CORS para testes
    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/query/run (POST)', () => {
    it('deve retornar 400 se o subject não for válido', () => {
      return request(app.getHttpServer())
        .post('/api/v1/query/run')
        .send({
          subject: 'invalid',
          measures: [
            { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
          ],
        })
        .expect(400);
    });

    it('deve retornar 400 se não houver medidas', () => {
      return request(app.getHttpServer())
        .post('/api/v1/query/run')
        .send({
          subject: 'vendas',
          measures: [],
        })
        .expect(400);
    });

    it('deve executar uma query válida de vendas', () => {
      return request(app.getHttpServer())
        .post('/api/v1/query/run')
        .send({
          subject: 'vendas',
          measures: [
            { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
          ],
          limit: 10,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('metadata');
        });
    });

    it('deve validar limite máximo de 100000', () => {
      return request(app.getHttpServer())
        .post('/api/v1/query/run')
        .send({
          subject: 'vendas',
          measures: [
            { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
          ],
          limit: 200000,
        })
        .expect(400);
    });
  });

  describe('/query/product-combinations (GET)', () => {
    it('deve retornar combinações de produtos', () => {
      return request(app.getHttpServer())
        .get('/api/v1/query/product-combinations?minOccurrences=1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('metadata');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('deve aplicar filtro de mínimo de ocorrências', () => {
      return request(app.getHttpServer())
        .get('/api/v1/query/product-combinations?minOccurrences=10')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('deve aplicar filtro de data', () => {
      return request(app.getHttpServer())
        .get(
          '/api/v1/query/product-combinations?minOccurrences=1&startDate=2025-01-01&endDate=2025-01-31',
        )
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });
  });
});

