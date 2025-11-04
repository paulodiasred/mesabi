import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QueryService } from './query.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRequestDto, QuerySubject, MeasureAggregation, FilterOperator } from './dto/query-request.dto';

describe('QueryService', () => {
  let service: QueryService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    it('deve executar uma query simples de vendas', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.VENDAS,
        measures: [
          { name: 'faturamento', aggregation: MeasureAggregation.SUM, field: 'total_amount' },
        ],
        dimensions: [],
        limit: 10,
      };

      const mockResult = [{ faturamento: 10000 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeQuery(request);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(result.data).toEqual(mockResult);
      expect(result.metadata.totalRows).toBe(1);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('deve executar uma query com dimensões', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.PRODUTOS,
        measures: [
          { name: 'quantidade', aggregation: MeasureAggregation.SUM, field: 'quantity' },
        ],
        dimensions: [{ name: 'Produto', field: 'product_id' }],
        limit: 20,
      };

      const mockResult = [
        { product_id: 1, quantidade: 100 },
        { product_id: 2, quantidade: 200 },
      ];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeQuery(request);

      expect(result.data).toHaveLength(2);
      expect(result.metadata.totalRows).toBe(2);
    });

    it('deve executar uma query com filtros de data', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.VENDAS,
        measures: [
          { name: 'faturamento', aggregation: MeasureAggregation.SUM, field: 'total_amount' },
        ],
        filters: [
          {
            field: 'created_at',
            op: FilterOperator.GTE,
            value: '2025-01-01',
          },
        ],
      };

      const mockResult = [{ faturamento: 5000 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeQuery(request);

      expect(result.data).toEqual(mockResult);
      const sqlCall = mockPrismaService.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('WHERE');
      expect(sqlCall).toContain('created_at');
    });

    it('deve executar uma query com timeRange', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.VENDAS,
        measures: [
          { name: 'faturamento', aggregation: MeasureAggregation.SUM, field: 'total_amount' },
        ],
        timeRange: {
          from: '2025-01-01',
          to: '2025-01-31',
        },
      };

      const mockResult = [{ faturamento: 3000 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeQuery(request);

      expect(result.data).toEqual(mockResult);
      const sqlCall = mockPrismaService.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('WHERE');
    });

    it('deve executar uma query com ORDER BY', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.PRODUTOS,
        measures: [
          { name: 'quantidade', aggregation: MeasureAggregation.SUM, field: 'quantity' },
        ],
        dimensions: [{ name: 'Produto', field: 'product_id' }],
        orderBy: {
          field: 'quantidade',
          direction: 'desc' as const,
        },
        limit: 10,
      };

      const mockResult = [{ product_id: 1, quantidade: 100 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeQuery(request);

      expect(result.data).toEqual(mockResult);
      const sqlCall = mockPrismaService.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('ORDER BY');
      expect(sqlCall).toContain('DESC');
    });

    it('deve lançar erro se a query falhar', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.VENDAS,
        measures: [
          { name: 'faturamento', aggregation: MeasureAggregation.SUM, field: 'total_amount' },
        ],
      };

      mockPrismaService.$queryRawUnsafe.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.executeQuery(request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve processar query com limite válido', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.VENDAS,
        measures: [
          { name: 'faturamento', aggregation: MeasureAggregation.SUM, field: 'total_amount' },
        ],
        limit: 50000, // Limite válido
      };

      const mockResult = [{ faturamento: 10000 }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeQuery(request);

      expect(result.data).toEqual(mockResult);
    });
  });

  describe('getProductCombinations', () => {
    it('deve calcular combinações de produtos', async () => {
      const mockResult = [
        {
          produto1_id: 1,
          produto2_id: 2,
          vezes_juntos: 10,
          receita_total: 5000,
          ticket_medio: 500,
        },
        {
          produto1_id: 3,
          produto2_id: 4,
          vezes_juntos: 5,
          receita_total: 2500,
          ticket_medio: 500,
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.getProductCombinations(1);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('metadata');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].vezes_juntos).toBe(10);
      expect(mockPrismaService.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('deve aplicar filtro de mínimo de ocorrências', async () => {
      const mockResult = [
        {
          produto1_id: 1,
          produto2_id: 2,
          vezes_juntos: 10,
          receita_total: 5000,
          ticket_medio: 500,
        },
      ];

      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.getProductCombinations(5);

      expect(result.data).toHaveLength(1);
      const sqlCall = mockPrismaService.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('HAVING COUNT(*) >= 5');
    });

    it('deve aplicar filtro de timeRange', async () => {
      const mockResult: any[] = [];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const timeRange = {
        start: '2025-01-01',
        end: '2025-01-31',
      };

      await service.getProductCombinations(1, timeRange);

      const sqlCall = mockPrismaService.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('WHERE');
      expect(sqlCall).toContain('created_at');
      expect(sqlCall).toContain('2025-01-01');
      expect(sqlCall).toContain('2025-01-31');
    });

    it('deve lançar erro se a query falhar', async () => {
      mockPrismaService.$queryRawUnsafe.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getProductCombinations(1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processBigInt', () => {
    it('deve processar corretamente números BigInt', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.VENDAS,
        measures: [
          { name: 'faturamento', aggregation: MeasureAggregation.SUM, field: 'total_amount' },
        ],
      };

      // Simular BigInt retornado pelo Prisma
      const mockBigInt = BigInt('1234567890123456789');
      const mockResult = [{ faturamento: mockBigInt }];
      mockPrismaService.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeQuery(request);

      // Verificar que BigInt foi convertido para Number
      expect(typeof result.data[0].faturamento).toBe('number');
    });
  });
});

