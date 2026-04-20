import { Test, TestingModule } from '@nestjs/testing';
import {
  VoidTransactionUseCase,
  VoidTransactionCommand,
} from '../../application/use-cases/void-transaction.usecase';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../domain/transaction.entity';

describe('VoidTransactionUseCase', () => {
  let useCase: VoidTransactionUseCase;
  let mockTransactionRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const mockTransactionRepoObj = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoidTransactionUseCase,
        {
          provide: 'TransactionRepositoryPort',
          useValue: mockTransactionRepoObj,
        },
      ],
    }).compile();

    useCase = module.get<VoidTransactionUseCase>(VoidTransactionUseCase);
    mockTransactionRepo = module.get('TransactionRepositoryPort');
  });

  it('should create VOID_ADJUSTMENT for a valid transaction', async () => {
    const originalTransaction = {
      id: 'original-id',
      transactionType: TransactionType.SALE,
      status: TransactionStatus.CONFIRMED,
      branchId: 'branch-1',
      userId: 'user-1',
      subtotal: 1000,
      taxAmount: 190,
      discountAmount: 0,
      total: 1190,
      documentNumber: 'SALE-001',
      createdAt: new Date(),
      paymentMethod: 'CASH' as any,
      amountPaid: 1190,
      lines: [],
      metadata: { someData: 'value' },
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);
    mockTransactionRepo.save.mockResolvedValue({} as Transaction);

    const command = new VoidTransactionCommand(
      'original-id',
      'Cliente solicitó devolución',
      'admin-user',
      'Anulación por solicitud del cliente',
    );

    const result = await useCase.execute(command);

    expect(mockTransactionRepo.save).toHaveBeenCalledTimes(2); // Original + void
    expect(result.transactionType).toBe(TransactionType.VOID_ADJUSTMENT);
    expect(result.relatedTransactionId).toBe('original-id');
    expect(result.total).toBe(-1190); // Monto negativo
    expect(result.metadata?.voidReason).toBe('Cliente solicitó devolución');
    expect(result.metadata?.voidApprovedBy).toBe('admin-user');
  });

  it('should throw error for non-existent transaction', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    const command = new VoidTransactionCommand('invalid-id', 'Test', 'admin');

    await expect(useCase.execute(command)).rejects.toThrow(
      'Transacción invalid-id no encontrada',
    );
  });

  it('should throw error for already cancelled transaction', async () => {
    const cancelledTransaction = {
      id: 'cancelled-id',
      status: TransactionStatus.CANCELLED,
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(cancelledTransaction);

    const command = new VoidTransactionCommand('cancelled-id', 'Test', 'admin');

    await expect(useCase.execute(command)).rejects.toThrow(
      'La transacción ya está anulada',
    );
  });

  it('should throw error for non-voidable transaction types', async () => {
    const voidTransaction = {
      id: 'void-id',
      transactionType: TransactionType.VOID_ADJUSTMENT,
      status: TransactionStatus.CONFIRMED,
    } as Transaction;

    mockTransactionRepo.findById.mockResolvedValue(voidTransaction);

    const command = new VoidTransactionCommand('void-id', 'Test', 'admin');

    await expect(useCase.execute(command)).rejects.toThrow(
      'Tipo de transacción VOID_ADJUSTMENT no se puede anular',
    );
  });
});
