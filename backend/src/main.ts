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

  // CORS: preflight OPTIONS debe responder antes del router de Nest (evita 404 en rutas solo-GET).
  if (configService.app.features.enableCors) {
    const expressApp = app.getHttpAdapter().getInstance() as {
      use: (
        fn: (
          req: { method?: string; headers?: Record<string, string | string[] | undefined> },
          res: {
            status: (code: number) => { end: (chunk?: string) => void };
            setHeader: (name: string, value: string) => void;
          },
          next: () => void,
        ) => void,
      ) => void;
    };
    expressApp.use((req, res, next) => {
      if (req.method !== 'OPTIONS') {
        return next();
      }
      const configured = configService.app.cors.origin;
      const reqOrigin = typeof req.headers?.origin === 'string' ? req.headers.origin : '';
      let allowOrigin = configured;
      if (configured === '*' && configService.app.cors.credentials && reqOrigin) {
        allowOrigin = reqOrigin;
      }
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      if (configService.app.cors.credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization,Content-Type,X-Active-Company-Id,x-active-company-id',
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    });
  }

  // CORS Configuration
  if (configService.app.features.enableCors) {
    app.enableCors({
      origin: configService.app.cors.origin,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: configService.app.cors.credentials,
      allowedHeaders: [
        'Authorization',
        'Content-Type',
        'X-Active-Company-Id',
        'x-active-company-id',
      ],
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
