import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentRepository } from '@modules/installments/infrastructure/installment.repository';

/**
 * LISTENER: Actualiza cuotas cuando se registra un pago
 *
 * Escucha el evento 'transaction.created' y si detecta:
 * - PAYMENT_IN o SUPPLIER_PAYMENT
 * - relatedTransactionId apunta a una SALE/PURCHASE
 *
 * Busca la cuota correspondiente y la actualiza:
 * - Incrementa amountPaid
 * - Actualiza status (PENDING → PARTIAL → PAID)
 * - Asocia paymentTransactionId
 */
@Injectable()
export class UpdateInstallmentFromPaymentListener {
  private logger = new Logger(UpdateInstallmentFromPaymentListener.name);

  constructor(
    private readonly installmentService: InstallmentService,
    private readonly installmentRepo: InstallmentRepository,
  ) {}

  @OnEvent('transaction.created', { async: true })
  async handlePaymentCreated(event: TransactionCreatedEvent) {
    const { transaction } = event;

    // Solo procesar transacciones de pago
    if (
      ![
        TransactionType.PAYMENT_IN,
        TransactionType.SUPPLIER_PAYMENT,
        TransactionType.EXPENSE_PAYMENT,
        TransactionType.PAYMENT_EXECUTION,
      ].includes(transaction.transactionType)
    ) {
      return;
    }

    try {
      const paidQuotaId = (transaction.metadata as any)?.paidQuotaId;

      if (paidQuotaId) {
        await this.installmentService.updateInstallmentFromPayment(
          paidQuotaId,
          parseFloat(transaction.total.toString()),
          transaction.id,
        );
        return;
      }

      // Validar que tiene referencia a transacción original
      if (!transaction.relatedTransactionId) {
        return;
      }

      this.logger.log(
        `[UPDATE INSTALLMENTS] Processing payment ${transaction.id} ` +
          `referencing transaction ${transaction.relatedTransactionId}`,
      );

      // Buscar cuotas de la transacción original
      const installments =
        await this.installmentRepo.getInstallmentsByTransaction(
          transaction.relatedTransactionId,
        );

      if (installments.length === 0) {
        // Transacción sin cuotas, no hacer nada
        return;
      }

      // Buscar la primera cuota PENDING o PARTIAL para aplicar el pago
      const targetInstallment = installments.find(
        (i) => i.status === 'PENDING' || i.status === 'PARTIAL',
      );

      if (!targetInstallment) {
        this.logger.warn(
          `[UPDATE INSTALLMENTS] No pending installments found for transaction ${transaction.relatedTransactionId}`,
        );
        return;
      }

      this.logger.log(
        `[UPDATE INSTALLMENTS] Found target installment ${targetInstallment.installmentNumber}/${targetInstallment.totalInstallments}, ` +
          `applying payment of $${transaction.total}`,
      );

      // Actualizar la cuota
      const updated =
        await this.installmentService.updateInstallmentFromPayment(
          targetInstallment.id,
          parseFloat(transaction.total.toString()),
          transaction.id,
        );

      this.logger.log(
        `[UPDATE INSTALLMENTS] Installment updated: ` +
          `Status=${updated.status}, Paid=$${updated.amountPaid}/${updated.amount}`,
      );
    } catch (error) {
      this.logger.error(
        `[UPDATE INSTALLMENTS] Error updating installment for payment ${transaction.id}`,
        error,
      );
      // No fallar el pago por error en cuotas
    }
  }
}
