import { Injectable, BadRequestException } from '@nestjs/common';
import { TransactionRepositoryPort } from '../ports/transaction.repository.port';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../domain/transaction.entity';
import { CacheService } from '../../../../shared/cache/cache.service';

/**
 * Comando para anular una transacción
 */
export class VoidTransactionCommand {
  constructor(
    public readonly transactionId: string,
    public readonly reason: string,
    public readonly approvedBy: string,
    public readonly notes?: string,
  ) {}
}

/**
 * Use Case: Anular Transacción
 *
 * Crea una transacción VOID_ADJUSTMENT que anula la transacción original.
 * Mantiene trazabilidad completa con metadata de la anulación.
 */
@Injectable()
export class VoidTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepositoryPort,
    private readonly cacheService: CacheService,
  ) {}

  async execute(command: VoidTransactionCommand): Promise<Transaction> {
    // Validar transacción original
    const originalTransaction = await this.transactionRepository.findById(
      command.transactionId,
    );
    if (!originalTransaction) {
      throw new BadRequestException(
        `Transacción ${command.transactionId} no encontrada`,
      );
    }

    // Validar que se pueda anular
    if (originalTransaction.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException('La transacción ya está anulada');
    }

    // Validar tipos que se pueden anular
    const nonVoidableTypes = [
      TransactionType.VOID_ADJUSTMENT,
      TransactionType.PAYMENT_EXECUTION,
      TransactionType.CASH_SESSION_OPENING,
      TransactionType.CASH_SESSION_CLOSING,
    ];

    if (nonVoidableTypes.includes(originalTransaction.transactionType)) {
      throw new BadRequestException(
        `Tipo de transacción ${originalTransaction.transactionType} no se puede anular`,
      );
    }

    // Crear transacción de anulación
    const voidTransaction = new Transaction();
    voidTransaction.transactionType = TransactionType.VOID_ADJUSTMENT;
    voidTransaction.status = TransactionStatus.CONFIRMED;
    voidTransaction.branchId = originalTransaction.branchId;
    voidTransaction.userId = originalTransaction.userId;
    voidTransaction.relatedTransactionId = command.transactionId; // Referencia a la original

    // Montos: negativo del original para contrarrestar
    voidTransaction.subtotal = -originalTransaction.subtotal;
    voidTransaction.taxAmount = -originalTransaction.taxAmount;
    voidTransaction.discountAmount = -originalTransaction.discountAmount;
    voidTransaction.total = -originalTransaction.total;

    // Metadata de anulación
    voidTransaction.metadata = {
      voidReason: command.reason,
      voidApprovedBy: command.approvedBy,
      voidTimestamp: new Date().toISOString(),
      originalTransactionType: originalTransaction.transactionType,
      originalTransactionDate: originalTransaction.createdAt.toISOString(),
      ...originalTransaction.metadata,
    };

    if (command.notes) {
      voidTransaction.notes = command.notes;
    }

    // Copiar otras referencias relevantes
    voidTransaction.customerId = originalTransaction.customerId;
    voidTransaction.supplierId = originalTransaction.supplierId;
    voidTransaction.pointOfSaleId = originalTransaction.pointOfSaleId;
    voidTransaction.cashSessionId = originalTransaction.cashSessionId;

    // Generar número de documento
    voidTransaction.documentNumber = await this.generateVoidDocumentNumber(
      originalTransaction.documentNumber,
      originalTransaction.branchId!,
    );

    // Marcar transacción original como anulada (sin cambiar status para mantener historial)
    // En su lugar, agregamos metadata de anulación
    originalTransaction.metadata = {
      ...originalTransaction.metadata,
      voidedBy: voidTransaction.id,
      voidedAt: new Date().toISOString(),
      voidReason: command.reason,
    };

    // Guardar ambas transacciones
    await this.transactionRepository.save(voidTransaction);
    await this.transactionRepository.save(originalTransaction);

    // Invalidar caché relacionado con la transacción
    await this.invalidateRelatedCache(originalTransaction);

    return voidTransaction;
  }

  private async generateVoidDocumentNumber(
    originalDocumentNumber: string,
    branchId: string,
  ): Promise<string> {
    // Generar número único para la anulación
    const timestamp = Date.now();
    return `VOID-${originalDocumentNumber}-${timestamp}`;
  }

  /**
   * Invalida el caché relacionado con la transacción anulada
   */
  private async invalidateRelatedCache(
    transaction: Transaction,
  ): Promise<void> {
    // Invalidar caché de transacción específica
    await this.cacheService.invalidateTransactionDetails(transaction.id);

    // Invalidar caché de cliente si aplica
    if (transaction.customerId) {
      await this.cacheService.invalidateCustomerCache(transaction.customerId);
    }

    // Invalidar resúmenes diarios/mensuales que puedan incluir esta transacción
    const transactionDate = transaction.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
    await this.cacheService.invalidateTransactionSummary(transactionDate);

    // Invalidar ventas diarias si es una venta
    if (transaction.transactionType === TransactionType.SALE) {
      await this.cacheService.invalidateDailySales(transactionDate);
    }
  }
}
