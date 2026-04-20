import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { InventoryController } from './presentation/inventory.controller';
import { InventoryService } from './application/inventory.service';
import { InventoryServiceAdapter } from './application/inventory.service.adapter';
import { StoragesModule } from '../storages/storages.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { User } from '@modules/users/domain/user.entity';

// CQRS Handlers
import { GetStockFiltersQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetAllStocksQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetStockByIdQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetLowStockItemsQueryHandler } from './application/handlers/queries/get-stock.handlers';
import { GetStockMovementHistoryQueryHandler } from './application/handlers/queries/get-stock.handlers';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    StoragesModule,
    TransactionsModule,
    CqrsModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryServiceAdapter,
    GetStockFiltersQueryHandler,
    GetAllStocksQueryHandler,
    GetStockByIdQueryHandler,
    GetLowStockItemsQueryHandler,
    GetStockMovementHistoryQueryHandler,
  ],
  exports: [InventoryService, InventoryServiceAdapter],
})
export class InventoryModule {}
