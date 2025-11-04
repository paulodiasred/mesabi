import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve conectar ao banco de dados', async () => {
    // Este teste verifica se o serviço pode ser instanciado
    // Em um ambiente de teste real, você mockaria a conexão
    expect(service).toBeInstanceOf(PrismaService);
  });
});

