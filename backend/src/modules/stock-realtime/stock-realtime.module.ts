import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { StockRealtimePublisher } from './stock-realtime.publisher';
import { StockRealtimeGateway } from './stock-realtime.gateway';
import { WsStockTenantService } from './ws-stock-tenant.service';
import { StockThresholdSweepService } from './stock-threshold-sweep.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company, Storage])],
  providers: [
    WsStockTenantService,
    StockRealtimePublisher,
    StockRealtimeGateway,
    StockThresholdSweepService,
  ],
  exports: [StockRealtimePublisher],
})
export class StockRealtimeModule {}
