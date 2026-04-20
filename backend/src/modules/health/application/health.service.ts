import { Injectable } from '@nestjs/common';
import { MetricsService } from '../../../shared/metrics/metrics.service';

@Injectable()
export class HealthService {
  constructor(private readonly metricsService: MetricsService) {}

  check() {
    // Actualizar métricas de sistema
    this.updateSystemMetrics();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'flow-backend-nestjs',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  checkDatabase() {
    // Este endpoint sera mejorado despues con @nestjs/terminus
    return {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Actualizar métricas del sistema en Prometheus
   */
  private updateSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metricsService.updateMemoryUsage(memUsage.heapUsed);

    // CPU usage aproximado (esto es simplificado, en producción usar una librería más precisa)
    const cpuUsage = process.cpuUsage();
    const totalCpuTime = cpuUsage.user + cpuUsage.system;
    const cpuPercent = (totalCpuTime / (process.uptime() * 1000000)) * 100;
    this.metricsService.updateCpuUsage(Math.min(cpuPercent, 100));
  }
}
