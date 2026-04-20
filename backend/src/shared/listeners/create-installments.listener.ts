import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentSourceType } from '@modules/installments/domain/installment.entity';

/**
 * LISTENER: Crea cuotas automáticamente cuando se genera una transacción con obligaciones de pago
 *
 * Escucha el evento 'transaction.created' y crea cuotas según el tipo:
 *
 * SALE/PURCHASE a plazo:
 * - Requiere metadata.numberOfInstallments >= 2
 * - Requiere metadata.firstDueDate
 * - Crea N cuotas con montos iguales distribuidos en meses
 *
 * PAYROLL:
 * - Crea 1 cuota por el total de la remuneración
 * - Fecha de vencimiento: metadata.paymentDate o 30 días desde hoy
 * - Registra empleado en metadata
 *
 * OPERATING_EXPENSE:
 * - Crea 1 cuota por el total del gasto
 * - Fecha de vencimiento: metadata.dueDate o 30 días desde hoy
 * - Registra proveedor/beneficiario en metadata
 */
@Injectable()
export class CreateInstallmentsListener {
  private logger = new Logger(CreateInstallmentsListener.name);

  constructor(private readonly installmentService: InstallmentService) {}

  @OnEvent('transaction.created', { async: true })
  async handleTransactionCreated(event: TransactionCreatedEvent) {
    const { transaction } = event;

    try {
      const metadata = transaction.metadata as any;

      // Caso 1: SALE o PURCHASE a plazo (múltiples cuotas)
      if (
        [TransactionType.SALE, TransactionType.PURCHASE].includes(
          transaction.transactionType,
        )
      ) {
        await this.handleSaleOrPurchaseInstallments(transaction, metadata);
        return;
      }

      // Caso 2: PAYROLL (remuneración - 1 cuota)
      if (transaction.transactionType === TransactionType.PAYROLL) {
        await this.handlePayrollInstallment(transaction, metadata);
        return;
      }

      // Caso 3: OPERATING_EXPENSE (gasto operativo - 1 cuota)
      if (transaction.transactionType === TransactionType.OPERATING_EXPENSE) {
        await this.handleOperatingExpenseInstallment(transaction, metadata);
        return;
      }
    } catch (error) {
      this.logger.error(
        `[CREATE INSTALLMENTS] Error creating installments for transaction ${transaction.id}`,
        error,
      );
      // No fallar la transacción por error en cuotas
    }
  }

  /**
   * Maneja cuotas para SALE o PURCHASE a plazo
   */
  private async handleSaleOrPurchaseInstallments(
    transaction: any,
    metadata: any,
  ) {
    // Validar si tiene configuración de cuotas
    if (!metadata?.numberOfInstallments || metadata.numberOfInstallments < 1) {
      return; // No es a plazo, no crear cuotas
    }

    if (!metadata.firstDueDate) {
      this.logger.warn(
        `Transaction ${transaction.id} has numberOfInstallments but no firstDueDate`,
      );
      return;
    }

    const numberOfInstallments = metadata.numberOfInstallments;
    const firstDueDate = new Date(metadata.firstDueDate);
    const sourceType =
      transaction.transactionType === TransactionType.SALE
        ? InstallmentSourceType.SALE
        : InstallmentSourceType.PURCHASE;

    this.logger.log(
      `[CREATE INSTALLMENTS] Creating ${numberOfInstallments} installments for ` +
        `${transaction.transactionType} ${transaction.id} - Total: $${transaction.total}`,
    );

    // Extraer información del beneficiario/deudor según tipo de transacción
    let payeeType: string;
    let payeeId: string | undefined;

    if (transaction.transactionType === TransactionType.SALE) {
      payeeType = 'CUSTOMER';
      payeeId = transaction.customerId || metadata.customerId;
    } else {
      // PURCHASE
      payeeType = 'SUPPLIER';
      payeeId = transaction.supplierId || metadata.supplierId;
    }

    // Si hay un paymentSchedule detallado con montos específicos por cuota, usarlo
    if (metadata.paymentSchedule && Array.isArray(metadata.paymentSchedule)) {
      this.logger.log(`[CREATE INSTALLMENTS] Using detailed payment schedule`);

      const installments: any[] = [];
      for (const payment of metadata.paymentSchedule) {
        const installment =
          await this.installmentService.createSingleInstallment(
            transaction.id,
            Number(payment.amount),
            new Date(payment.dueDate),
            {
              sourceType: sourceType,
              payeeType,
              payeeId,
              metadata: {
                installmentNumber: payment.installmentNumber,
                totalInstallments: numberOfInstallments,
              },
            },
          );
        installments.push(installment);
      }

      this.logger.log(
        `[CREATE INSTALLMENTS] Successfully created ${installments.length} installments from schedule`,
      );
      return;
    }

    // Crear cuotas con montos iguales distribuidos uniformemente
    const installments =
      await this.installmentService.createInstallmentsForTransaction(
        transaction.id,
        parseFloat(transaction.total.toString()),
        numberOfInstallments,
        firstDueDate,
        sourceType,
      );

    // Actualizar payeeType y payeeId en las cuotas creadas
    for (const inst of installments) {
      inst.payeeType = payeeType;
      inst.payeeId = payeeId;
    }

    this.logger.log(
      `[CREATE INSTALLMENTS] Successfully created ${installments.length} installments`,
    );

    // Log de cada cuota
    for (const inst of installments) {
      this.logger.debug(
        `Installment ${inst.installmentNumber}/${numberOfInstallments}: ` +
          `$${inst.amount} - Due: ${inst.dueDate.toISOString().split('T')[0]}`,
      );
    }
  }

  /**
   * Maneja cuota única para PAYROLL
   */
  private async handlePayrollInstallment(transaction: any, metadata: any) {
    const dueDate = metadata.paymentDate
      ? new Date(metadata.paymentDate)
      : this.getDefaultDueDate(30); // 30 días por defecto

    this.logger.log(
      `[CREATE INSTALLMENTS] Creating single installment for PAYROLL ${transaction.id} - ` +
        `Amount: $${transaction.total} - Due: ${dueDate.toISOString().split('T')[0]}`,
    );

    await this.installmentService.createSingleInstallment(
      transaction.id,
      parseFloat(transaction.total.toString()),
      dueDate,
      {
        sourceType: InstallmentSourceType.PAYROLL,
        payeeType: 'EMPLOYEE',
        payeeId: metadata.employeeId,
        metadata: {
          employeeName: metadata.employeeName,
          period: metadata.period,
        },
      },
    );

    this.logger.log(
      `[CREATE INSTALLMENTS] Successfully created PAYROLL installment`,
    );
  }

  /**
   * Maneja cuota única para OPERATING_EXPENSE
   */
  private async handleOperatingExpenseInstallment(
    transaction: any,
    metadata: any,
  ) {
    const dueDate = metadata.dueDate
      ? new Date(metadata.dueDate)
      : this.getDefaultDueDate(30); // 30 días por defecto

    this.logger.log(
      `[CREATE INSTALLMENTS] Creating single installment for OPERATING_EXPENSE ${transaction.id} - ` +
        `Amount: $${transaction.total} - Due: ${dueDate.toISOString().split('T')[0]}`,
    );

    await this.installmentService.createSingleInstallment(
      transaction.id,
      parseFloat(transaction.total.toString()),
      dueDate,
      {
        sourceType: InstallmentSourceType.OPERATING_EXPENSE,
        payeeType: metadata.supplierType || 'OTHER',
        payeeId: metadata.supplierId,
        metadata: {
          supplierName: metadata.supplierName,
          category: metadata.category,
        },
      },
    );

    this.logger.log(
      `[CREATE INSTALLMENTS] Successfully created OPERATING_EXPENSE installment`,
    );
  }

  /**
   * Calcula fecha de vencimiento por defecto
   */
  private getDefaultDueDate(daysFromNow: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }
}
