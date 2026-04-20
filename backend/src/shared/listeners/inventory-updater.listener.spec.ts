import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { InventoryUpdaterListener } from './inventory-updater.listener';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import {
  Transaction,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

// Helper to build a transaction object with lines
function makeTx(
  type: TransactionType,
  storageId?: string,
  targetStorageId?: string,
) {
  const tx: Partial<Transaction> = {
    id: 'tx-1',
    transactionType: type,
    storageId,
    targetStorageId,
    lines: [{ productVariantId: 'v1', quantity: 10, unitCost: 5 }] as any,
  };
  return tx as Transaction;
}

describe('InventoryUpdaterListener', () => {
  let listener: InventoryUpdaterListener;
  let dataSource: DataSource;

  // mocks used inside the fake transaction
  let stockRepo: any;
  let txRepo: any;
  let variantRepo: any;

  beforeEach(async () => {
    stockRepo = {
      findOne: jest.fn(),
      create: jest.fn((obj: any) => obj),
      save: jest.fn(),
    };
    txRepo = {
      findOne: jest.fn(),
    };
    variantRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    const mockManager = {
      getRepository: jest.fn((entity: any) => {
        if (entity === StockLevel) return stockRepo;
        if (entity === Transaction) return txRepo;
        if (entity === ProductVariant) return variantRepo;
        throw new Error('unexpected repository ' + entity?.name);
      }),
    };

    const mockDataSource = {
      transaction: jest.fn(async (cb: any) => {
        // simulate running inside a transaction
        await cb(mockManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryUpdaterListener,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    listener = module.get<InventoryUpdaterListener>(InventoryUpdaterListener);
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  it('ignores unrelated transaction types', async () => {
    const tx = makeTx(TransactionType.PAYROLL);
    const event = new TransactionCreatedEvent(tx, 'company');
    await listener.handleTransactionCreated(event as any);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('adds stock for PURCHASE transactions', async () => {
    const tx = makeTx(TransactionType.PURCHASE, 'storage-1');
    const event = new TransactionCreatedEvent(tx, 'company');

    // no existing stock
    stockRepo.findOne.mockResolvedValue(undefined);
    txRepo.findOne.mockResolvedValue(
      Object.assign({}, tx, { lines: tx.lines }),
    );

    await listener.handleTransactionCreated(event as any);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(stockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        productVariantId: 'v1',
        storageId: 'storage-1',
        physicalStock: 10,
        availableStock: 10,
        lastTransactionId: tx.id,
      }),
    );
  });

  it('subtracts stock for SALE transactions', async () => {
    const tx = makeTx(TransactionType.SALE, 'storage-2');
    const event = new TransactionCreatedEvent(tx, 'company');

    // existing stock with 50 units
    stockRepo.findOne.mockResolvedValue({
      physicalStock: 50,
      availableStock: 50,
    });
    txRepo.findOne.mockResolvedValue(
      Object.assign({}, tx, { lines: tx.lines }),
    );

    await listener.handleTransactionCreated(event as any);

    expect(stockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        physicalStock: 40, // 50 - 10
        availableStock: 40,
        lastTransactionId: tx.id,
      }),
    );
  });

  it('creates new negative stock record when sale occurs with no prior stock', async () => {
    const tx = makeTx(TransactionType.SALE, 'storage-3');
    const event = new TransactionCreatedEvent(tx, 'company');

    stockRepo.findOne.mockResolvedValue(undefined);
    txRepo.findOne.mockResolvedValue(
      Object.assign({}, tx, { lines: tx.lines }),
    );

    await listener.handleTransactionCreated(event as any);

    expect(stockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productVariantId: 'v1',
        storageId: 'storage-3',
        physicalStock: -10,
        availableStock: -10,
        lastTransactionId: tx.id,
      }),
    );
  });

  it('logs a warning and skips when storageId missing', async () => {
    const tx: any = makeTx(TransactionType.SALE);
    // remove any storage IDs
    tx.storageId = undefined;
    tx.targetStorageId = undefined;
    const event = new TransactionCreatedEvent(tx, 'company');

    await listener.handleTransactionCreated(event as any);
    // transaction should still open, but warning thrown; we can't easily
    // intercept logger here so just ensure findOne was never called
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
