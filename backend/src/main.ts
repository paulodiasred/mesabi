import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './app/common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting application bootstrap...');

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    logger.log('AppModule created successfully');

    // Global prefix
    app.setGlobalPrefix('api/v1');
    logger.log('Global prefix set to: api/v1');

    // Validation
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
    logger.log('Validation pipes configured');

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());
    logger.log('Exception filters configured');

    // CORS
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',') 
      : ['http://localhost:3000'];
    
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all origins for now (adjust for production)
        }
      },
      credentials: true,
    });
    logger.log('CORS configured');

    // Swagger
    const config = new DocumentBuilder()
      .setTitle('ComidaSmart API')
      .setDescription('Analytics API for Restaurants')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger configured');

    const port = process.env.PORT || 3001;
    logger.log(`Attempting to listen on port: ${port}`);
    
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 ComidaSmart Backend is running on: http://0.0.0.0:${port}`);
    logger.log(`📚 API Docs available at: http://0.0.0.0:${port}/api/docs`);
    logger.log(`✅ Health check available at: http://0.0.0.0:${port}/api/v1/health`);
  } catch (error) {
    logger.error('❌ Error during bootstrap:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

bootstrap();

