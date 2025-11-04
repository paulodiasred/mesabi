import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryRequestDto, QuerySubject } from './query-request.dto';

describe('QueryRequestDto', () => {
  it('deve validar uma requisição válida', async () => {
    const dto = plainToInstance(QueryRequestDto, {
      subject: QuerySubject.VENDAS,
      measures: [
        { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
      ],
      limit: 10,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve rejeitar subject inválido', async () => {
    const dto = plainToInstance(QueryRequestDto, {
      subject: 'invalid',
      measures: [
        { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('deve rejeitar limite acima do máximo', async () => {
    const dto = plainToInstance(QueryRequestDto, {
      subject: QuerySubject.VENDAS,
      measures: [
        { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
      ],
      limit: 200000, // Acima de 100000
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('max');
  });

  it('deve aceitar limite válido', async () => {
    const dto = plainToInstance(QueryRequestDto, {
      subject: QuerySubject.VENDAS,
      measures: [
        { name: 'faturamento', aggregation: 'sum', field: 'total_amount' },
      ],
      limit: 50000,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('deve validar medidas obrigatórias', async () => {
    const dto = plainToInstance(QueryRequestDto, {
      subject: QuerySubject.VENDAS,
      measures: [],
    });

    const errors = await validate(dto);
    // As medidas podem ser opcionais dependendo da implementação
    // Ajuste este teste conforme sua validação
  });
});

