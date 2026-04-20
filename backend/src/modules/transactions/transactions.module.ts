import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './presentation/transactions.controller';
import { SupplierPaymentsController } from './presentation/supplier-payments.controller';
import { OperatingExpenseTransactionsController } from './presentation/operating-expense-transactions.controller';
import { InventoryController } from './presentation/controllers/inventory.controller';
import { TransactionsService } from './application/transactions.service';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { LedgerEntriesModule } from '@modules/ledger-entries/ledger-entries.module';
import { AccountingPeriodsModule } from '@modules/accounting-periods/accounting-periods.module';

// CQRS Handlers
import { CreateTransactionCommandHandler } from './application/handlers/commands/create-transaction.handler';
import { CompleteSupplierPaymentCommandHandler } from './application/handlers/commands/complete-supplier-payment.handler';
import { VoidTransactionCommandHandler } from './application/handlers/commands/void-transaction.handler';
import { CompleteTransactionCommandHandler } from './application/handlers/commands/complete-transaction.handler';
import { GetTransactionByIdQueryHandler } from './application/handlers/queries/get-transaction-by-id.handler';
import { SearchTransactionsQueryHandler } from './application/handlers/queries/search-transactions.handler';
import { ListJournalQueryHandler } from './application/handlers/queries/list-journal.handler';
import { GetSupplierPaymentContextQueryHandler } from './application/handlers/queries/get-supplier-payment-context.handler';
import { GetTransactionDetailQueryHandler } from './application/handlers/queries/get-transaction-detail.handler';
import { ListTransactionsQueryHandler } from './application/handlers/queries/list-transactions.handler';

// New CQRS Handlers (migrated from service)
import { CreateTransactionUseCase } from './application/commands/create-transaction.usecase';
import { CompletePaymentUseCase } from './application/commands/complete-payment.usecase';
import { GetTotalSalesForSessionQueryHandler } from './application/queries/get-total-sales-for-session.query';
import { GetMovementsForSessionQueryHandler } from './application/queries/get-movements-for-session.query';
import { FindTransactionQueryHandler } from './application/queries/find-transaction.query';
import { TransactionsServiceAdapter } from './application/transactions.service.adapter';

// Inventory CQRS
import { inventoryCommandHandlers } from './application/commands/inventory';
import { inventoryQueryHandlers } from './application/queries/inventory';
import { InventoryEventHandler } from './application/events/inventory-event.handler';

// Event Store
import { EventStoreModule } from './infrastructure/event-store/event-store.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Branch]),
    LedgerEntriesModule,
    AccountingPeriodsModule,
    CqrsModule,
    EventStoreModule,
  ],
  controllers: [
    TransactionsController,
    SupplierPaymentsController,
    OperatingExpenseTransactionsController,
    InventoryController,
  ],
  providers: [
    TransactionsService, // Adapter for backward compatibility
    TransactionsServiceAdapter,
    // Command Handlers
    CreateTransactionCommandHandler,
    CompleteSupplierPaymentCommandHandler,
    VoidTransactionCommandHandler,
    CompleteTransactionCommandHandler,
    // New migrated handlers
    CreateTransactionUseCase,
    CompletePaymentUseCase,
    // Query Handlers
    GetTransactionByIdQueryHandler,
    SearchTransactionsQueryHandler,
    ListJournalQueryHandler,
    GetSupplierPaymentContextQueryHandler,
    GetTransactionDetailQueryHandler,
    ListTransactionsQueryHandler,
    // New migrated query handlers
    GetTotalSalesForSessionQueryHandler,
    GetMovementsForSessionQueryHandler,
    FindTransactionQueryHandler,
    // Inventory CQRS
    ...inventoryCommandHandlers,
    ...inventoryQueryHandlers,
    InventoryEventHandler,
  ],
  exports: [TransactionsService, TransactionsServiceAdapter], // Export adapter for other modules
})
export class TransactionsModule {}
