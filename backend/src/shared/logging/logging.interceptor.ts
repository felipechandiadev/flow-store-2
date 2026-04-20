import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { WinstonLoggerService } from './winston-logger.service';

/**
 * Interceptor de Logging para HTTP Requests
 *
 * Captura todas las operaciones HTTP y registra:
 * - Request details (method, url, user)
 * - Response time
 * - Status code
 * - Errores si ocurren
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Extraer información del request
    const { method, url, user, body, params, query } = request;
    const userId = user?.id || 'anonymous';
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip || request.connection?.remoteAddress || '';

    // Log del request entrante
    this.logger.log(`HTTP ${method} ${url}`, 'HTTP_REQUEST', {
      method,
      url,
      userId,
      userAgent,
      ip,
      params,
      query,
      bodySize: JSON.stringify(body || {}).length,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Log de respuesta exitosa
          this.logger.log(
            `HTTP ${method} ${url} - ${statusCode}`,
            'HTTP_RESPONSE',
            {
              method,
              url,
              userId,
              statusCode,
              duration,
              responseSize: JSON.stringify(data || {}).length,
              timestamp: new Date().toISOString(),
            },
          );

          // Log de performance si es lento
          if (duration > 1000) {
            this.logger.logPerformance(
              `Slow HTTP request: ${method} ${url}`,
              duration,
              {
                userId,
                statusCode,
                threshold: 1000,
              },
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log de error HTTP
          this.logger.error(
            `HTTP ${method} ${url} - ${statusCode}: ${error.message}`,
            'HTTP_ERROR',
            {
              method,
              url,
              userId,
              statusCode,
              duration,
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            },
          );
        },
      }),
    );
  }
}
