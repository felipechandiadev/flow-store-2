import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { buildStockUpdatedPayload } from './stock-threshold-alert-payload.util';
import { StockRealtimePublisher } from './stock-realtime.publisher';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Re-emite por WebSocket saldos que violan umbrales (p. ej. cambios vía SQL u otros canales
 * sin pasar por `TransactionCreatedEvent`). Intervalo configurable con `STOCK_THRESHOLD_SWEEP_MS`
 * (0 = desactivado).
 */
@Injectable()
export class StockThresholdSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StockThresholdSweepService.name);
  private interval?: NodeJS.Timeout;
  private firstTimeout?: NodeJS.Timeout;

  constructor(
    private readonly dataSource: DataSource,
    private readonly publisher: StockRealtimePublisher,
  ) {}

  onModuleInit() {
    const raw = process.env.STOCK_THRESHOLD_SWEEP_MS;
    const intervalMs =
      raw !== undefined && raw !== ''
        ? parseInt(raw, 10)
        : DEFAULT_INTERVAL_MS;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      this.logger.log('Stock threshold sweep disabled (STOCK_THRESHOLD_SWEEP_MS<=0 or invalid)');
      return;
    }
    const firstDelay = Math.min(60_000, intervalMs);
    this.firstTimeout = setTimeout(() => {
      void this.runSweep().catch((e) =>
        this.logger.warn(`Initial stock sweep failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }, firstDelay);
    this.interval = setInterval(() => {
      void this.runSweep().catch((e) =>
        this.logger.warn(`Stock sweep failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }, intervalMs);
    this.logger.log(`Stock threshold sweep every ${intervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    if (this.firstTimeout) {
      clearTimeout(this.firstTimeout);
      this.firstTimeout = undefined;
    }
  }

  private async runSweep(): Promise<void> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT company_id AS "companyId" FROM stock_levels`,
    ) as Array<{ companyId: string }>;
    const companyIds = rows.map((r) => String(r.companyId || '').trim()).filter(Boolean);
    let emitted = 0;
    for (const companyId of companyIds) {
      const levels = await this.dataSource.getRepository(StockLevel).find({
        where: { companyId },
        relations: ['variant'],
      });
      for (const sl of levels) {
        if (!sl.variant) {
          continue;
        }
        const payload = buildStockUpdatedPayload(
          companyId,
          sl.variant,
          sl,
          sl.lastTransactionId ?? null,
        );
        if (payload.alerts.length === 0) {
          continue;
        }
        this.publisher.emitStockUpdated(payload);
        emitted += 1;
      }
    }
    if (emitted > 0) {
      this.logger.debug(`Stock threshold sweep emitted ${emitted} payload(s)`);
    }
  }
}
