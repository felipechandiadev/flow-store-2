import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { RecipesModule } from '@modules/recipes/recipes.module';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { OrdersController } from './presentation/orders.controller';
import { ServiceOrdersController } from './presentation/service-orders.controller';
import { ProductionBatchesController } from './presentation/production-batches.controller';
import { OrderExecutionController } from './presentation/order-execution.controller';
import { CompleteServiceOrderUseCase } from './application/commands/complete-service-order.usecase';
import { CompleteProductionBatchUseCase } from './application/commands/complete-production-batch.usecase';

@Module({
  imports: [
    CqrsModule,
    TransactionsModule,
    RecipesModule,
    TypeOrmModule.forFeature([Transaction, TransactionLine]),
  ],
  controllers: [
    OrdersController,
    ServiceOrdersController,
    ProductionBatchesController,
    OrderExecutionController,
  ],
  providers: [CompleteServiceOrderUseCase, CompleteProductionBatchUseCase],
})
export class OrdersModule {}

