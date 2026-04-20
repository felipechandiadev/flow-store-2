import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AnalyticsController } from './presentation/analytics.controller';
import { AnalyticsService } from './application/analytics.service';
import { AnalyticsServiceAdapter } from './application/analytics.service.adapter';
import { TypeOrmAnalyticsRepository } from './infrastructure/repositories/typeorm-analytics.repository';
import { GetDashboardStatsQueryHandler } from './application/handlers/queries/get-dashboard-stats.handler';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([Customer, Transaction, StockLevel])],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsServiceAdapter,
    {
      provide: 'AnalyticsRepositoryPort',
      useClass: TypeOrmAnalyticsRepository,
    },
    GetDashboardStatsQueryHandler,
  ],
  exports: [AnalyticsService, AnalyticsServiceAdapter],
})
export class AnalyticsModule {}
