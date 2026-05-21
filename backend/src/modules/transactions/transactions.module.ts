import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './presentation/transactions.controller';
import { SupplierPaymentsController } from './presentation/supplier-payments.controller';
import { PurchaseOrdersController } from './presentation/purchase-orders.controller';
import { OperatingExpenseTransactionsController } from './presentation/operating-expense-transactions.controller';
import { InventoryTransactionsController } from './presentation/controllers/inventory.controller';
import { TransactionsService } from './application/transactions.service';
import { PurchaseOrdersService } from './application/purchase-orders.service';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DocumentSequence } from '@modules/transactions/domain/document-sequence.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { TransactionOrmEntity } from './infrastructure/orm-mappers/transaction.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { CustomerOrmEntity } from '@modules/customers/infrastructure/orm-mappers/customer.orm-entity';
import { TransactionLineOrmEntity } from '@modules/transaction-lines/infrastructure/orm-mappers/transaction-line.orm-entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { User } from '@modules/users/domain/user.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { LedgerEntriesModule } from '@modules/ledger-entries/ledger-entries.module';
import { AccountingPeriodsModule } from '@modules/accounting-periods/accounting-periods.module';
import { CacheModule } from '@shared/cache/cache.module';
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';

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
import { DocumentNumberService } from './application/document-number.service';
import { DocumentSequencesBootstrap } from './application/document-sequences.bootstrap';
import { BackorderTransactionTypeBootstrap } from './application/backorder-transaction-type.bootstrap';
import { PosSaleLookupService } from './application/pos-sale-lookup.service';
import { PosBackorderLookupService } from './application/pos-backorder-lookup.service';
import { SupplierFiscalDocumentPaymentAggregateService } from './application/services/supplier-fiscal-document-payment-aggregate.service';

// Inventory CQRS
import { inventoryCommandHandlers } from './application/commands/inventory';
import { inventoryQueryHandlers } from './application/queries/inventory';
import { InventoryEventHandler } from './application/events/inventory-event.handler';

// Event Store
import { EventStoreModule } from './infrastructure/event-store/event-store.module';
import { ProductVariantsModule } from '@modules/product-variants/product-variants.module';
import { StockLevelsModule } from '@modules/stock-levels/stock-levels.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      DocumentSequence,
      TransactionOrmEntity,
      TransactionLineOrmEntity,
      TransactionLine,
      Product,
      ProductVariant,
      Storage,
      Branch,
      BranchOrmEntity,
      User,
      Customer,
      CustomerOrmEntity,
      Tax,
    ]),
    LedgerEntriesModule,
    AccountingPeriodsModule,
    CqrsModule,
    EventStoreModule,
    CacheModule,
    ProductVariantsModule,
    StockLevelsModule,
  ],
  controllers: [
    TransactionsController,
    SupplierPaymentsController,
    PurchaseOrdersController,
    OperatingExpenseTransactionsController,
    InventoryTransactionsController,
  ],
  providers: [
    DocumentSequencesBootstrap,
    BackorderTransactionTypeBootstrap,
    DocumentNumberService,
    PosSaleLookupService,
    PosBackorderLookupService,
    SupplierFiscalDocumentPaymentAggregateService,
    PurchaseOrdersService,
    TransactionsService, // Adapter for backward compatibility
    TransactionsServiceAdapter,
    TransactionRepository,
    {
      provide: 'TransactionRepositoryPort',
      useClass: TransactionRepository,
    },
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
  exports: [
    TransactionsService,
    TransactionsServiceAdapter,
    SupplierFiscalDocumentPaymentAggregateService,
    DocumentNumberService,
  ],
})
export class TransactionsModule {}
