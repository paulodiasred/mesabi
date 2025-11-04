import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    this.$on('query' as never, (e: any) => {
      this.logger.debug('Query: ' + e.query);
      this.logger.debug('Duration: ' + e.duration + 'ms');
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Attempting to connect to database...');
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      this.logger.warn('Application will continue but database operations may fail');
      // Não lança erro para não travar o bootstrap
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('👋 Prisma disconnected');
  }
}

