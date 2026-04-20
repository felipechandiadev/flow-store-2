import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { StoragesService } from '../../storages/application/storages.service';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { User } from '@modules/users/domain/user.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

describe('InventoryService', () => {
  let service: InventoryService;
  let txService: TransactionsService;

  const mockStorages = { getAllStorages: jest.fn() };
  const mockDataSource = { getRepository: jest.fn() } as any;
  const mockTxService = { createTransaction: jest.fn() };
  const mockUserRepo: Partial<Repository<User>> = {};

  beforeEach(async () => {
    // prepare stock level repo stub for branch lookup
    const fakeStockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ branchId: 'branch-123' }),
      }),
    };

    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity === 'Branch') {
        return {}; // not used here
      }
      if (entity === StockLevel) {
        return fakeStockRepo;
      }
      return {};
    });

    // stub user repo to return a default user
    (mockUserRepo as any).findOne = jest
      .fn()
      .mockResolvedValue({ id: 'user-123' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: StoragesService, useValue: mockStorages },
        { provide: DataSource, useValue: mockDataSource },
        { provide: TransactionsService, useValue: mockTxService },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    txService = module.get<TransactionsService>(TransactionsService);

    jest.clearAllMocks();
  });

  it('should create an adjustment transaction and not touch stock directly', async () => {
    mockTxService.createTransaction.mockResolvedValue({
      documentNumber: 'DOC-1',
    });

    const result = await service.adjust({
      variantId: 'v1',
      storageId: 's1',
      currentQuantity: 100,
      targetQuantity: 80,
      note: 'reason',
    });

    expect(mockTxService.createTransaction).toHaveBeenCalled();
    const dto: CreateTransactionDto =
      mockTxService.createTransaction.mock.calls[0][0];
    expect(dto.transactionType).toBe(TransactionType.ADJUSTMENT_OUT);
    expect(dto.branchId).toBe('branch-123');
    expect(dto.userId).toBe('user-123');
    expect(dto.paymentMethod).toBe('INTERNAL_CREDIT' as any);
    expect(dto.storageId).toBe('s1');
    expect(dto.subtotal).toBe(20);
    expect(result).toEqual({
      success: true,
      message: 'Stock ajustado en -20',
      documentNumbers: ['DOC-1'],
    });
  });
});
