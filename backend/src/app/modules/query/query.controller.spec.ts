import { Test, TestingModule } from '@nestjs/testing';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { QueryRequestDto, QuerySubject, MeasureAggregation } from './dto/query-request.dto';

describe('QueryController', () => {
  let controller: QueryController;
  let service: QueryService;

  const mockQueryService = {
    executeQuery: jest.fn(),
    getProductCombinations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryController],
      providers: [
        {
          provide: QueryService,
          useValue: mockQueryService,
        },
      ],
    }).compile();

    controller = module.get<QueryController>(QueryController);
    service = module.get<QueryService>(QueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runQuery', () => {
    it('deve executar uma query e retornar resultado', async () => {
      const request: QueryRequestDto = {
        subject: QuerySubject.VENDAS,
        measures: [
          { name: 'faturamento', aggregation: MeasureAggregation.SUM, field: 'total_amount' },
        ],
      };

      const expectedResult = {
        data: [{ faturamento: 10000 }],
        metadata: {
          totalRows: 1,
          executionTime: 100,
          cached: false,
          sql: 'SELECT ...',
        },
      };

      mockQueryService.executeQuery.mockResolvedValue(expectedResult);

      const result = await controller.runQuery(request, {} as any);

      expect(result).toEqual(expectedResult);
      expect(mockQueryService.executeQuery).toHaveBeenCalledWith(request);
    });
  });

  describe('getProductCombinations', () => {
    it('deve retornar combinações de produtos', async () => {
      const expectedResult = {
        data: [
          {
            produto1_id: 1,
            produto2_id: 2,
            vezes_juntos: 10,
            receita_total: 5000,
            ticket_medio: 500,
          },
        ],
        metadata: {
          totalRows: 1,
          executionTime: 200,
          cached: false,
          sql: 'SELECT ...',
        },
      };

      mockQueryService.getProductCombinations.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getProductCombinations('1', undefined, undefined);

      expect(result).toEqual(expectedResult);
      expect(mockQueryService.getProductCombinations).toHaveBeenCalledWith(
        1,
        undefined,
      );
    });

    it('deve aplicar filtro de mínimo de ocorrências', async () => {
      const expectedResult = {
        data: [],
        metadata: { totalRows: 0, executionTime: 50, cached: false },
      };

      mockQueryService.getProductCombinations.mockResolvedValue(
        expectedResult,
      );

      await controller.getProductCombinations('10', undefined, undefined);

      expect(mockQueryService.getProductCombinations).toHaveBeenCalledWith(
        10,
        undefined,
      );
    });

    it('deve aplicar filtro de data', async () => {
      const expectedResult = {
        data: [],
        metadata: { totalRows: 0, executionTime: 50, cached: false },
      };

      mockQueryService.getProductCombinations.mockResolvedValue(
        expectedResult,
      );

      await controller.getProductCombinations(
        '1',
        '2025-01-01',
        '2025-01-31',
      );

      expect(mockQueryService.getProductCombinations).toHaveBeenCalledWith(1, {
        start: '2025-01-01',
        end: '2025-01-31',
      });
    });
  });
});

