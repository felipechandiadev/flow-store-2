import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './shared/logging/logging.interceptor';
import { MetricsInterceptor } from './shared/metrics/metrics.interceptor';
import { setupSwagger } from './shared/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get configuration service
  const configService = app.get(AppConfigService);

  // CORS Configuration
  if (configService.app.features.enableCors) {
    app.enableCors({
      origin: configService.app.cors.origin,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: configService.app.cors.credentials,
    });
  }

  // Set global prefix for all routes
  app.setGlobalPrefix(configService.app.apiPrefix);

  // Validation pipe global
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

  // Exception filter global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Errores HTTP y slow requests (sin log línea a línea de cada ruta)
  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  // Metrics interceptor global
  const metricsInterceptor = app.get(MetricsInterceptor);
  app.useGlobalInterceptors(metricsInterceptor);

  // Setup Swagger/OpenAPI documentation
  setupSwagger(app, configService);

  const port = configService.app.port;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
