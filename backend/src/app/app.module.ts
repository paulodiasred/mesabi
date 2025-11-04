import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { QueryModule } from './modules/query/query.module';
import { SemanticModule } from './modules/semantic/semantic.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { AppController } from './app.controller';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Cache (simplificado por enquanto)
    CacheModule.register({
      isGlobal: true,
      ttl: 3600,
    }),

    // App modules
    PrismaModule,
    AuthModule,
    QueryModule,
    SemanticModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}

