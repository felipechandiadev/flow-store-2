import { Injectable, Logger } from '@nestjs/common';
import { Transaction, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { InstallmentService } from '@modules/installments/application/services/installment.service';
import { InstallmentSourceType } from '@modules/installments/domain/installment.entity';
import { AutomationEventType } from '../../../domain/automation-event-type.enum';

@Injectable()
export class CreateInstallmentsActionHandler {
  private readonly logger = new Logger(CreateInstallmentsActionHandler.name);

  constructor(private readonly installmentService: InstallmentService) {}

  async execute(ctx: { companyId: string; eventType: AutomationEventType; payload: any }, rule: any) {
    const transaction = ctx.payload?.transaction as Transaction;
    if (!transaction?.id) return;

    try {
      const metadata = (transaction.metadata as any) ?? {};

      if ([TransactionType.SALE, TransactionType.PURCHASE].includes(transaction.transactionType)) {
        await this.handleSaleOrPurchase(transaction as any, metadata);
        return;
      }
      if (transaction.transactionType === TransactionType.PAYROLL) {
        await this.handlePayroll(transaction as any, metadata);
        return;
      }
      if (transaction.transactionType === TransactionType.OPERATING_EXPENSE) {
        await this.handleOperatingExpense(transaction as any, metadata);
        return;
      }
    } catch (e) {
      this.logger.error(
        `Error creating installments tx=${transaction.id} ruleId=${rule?.id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  private async handleSaleOrPurchase(transaction: any, metadata: any) {
    if (!metadata?.numberOfInstallments || metadata.numberOfInstallments < 1) {
      return;
    }
    if (!metadata.firstDueDate) {
      return;
    }
    const numberOfInstallments = metadata.numberOfInstallments;
    const firstDueDate = new Date(metadata.firstDueDate);
    const sourceType =
      transaction.transactionType === TransactionType.SALE
        ? InstallmentSourceType.SALE
        : InstallmentSourceType.PURCHASE;

    // Detailed schedule
    if (metadata.paymentSchedule && Array.isArray(metadata.paymentSchedule)) {
      for (const payment of metadata.paymentSchedule) {
        await this.installmentService.createSingleInstallment(
          transaction.id,
          Number(payment.amount),
          new Date(payment.dueDate),
          {
            sourceType,
            payeeType:
              transaction.transactionType === TransactionType.SALE ? 'CUSTOMER' : 'SUPPLIER',
            payeeId:
              transaction.transactionType === TransactionType.SALE
                ? transaction.customerId || metadata.customerId
                : transaction.supplierId || metadata.supplierId,
            metadata: {
              installmentNumber: payment.installmentNumber,
              totalInstallments: numberOfInstallments,
            },
          },
        );
      }
      return;
    }

    await this.installmentService.createInstallmentsForTransaction(
      transaction.id,
      parseFloat(transaction.total.toString()),
      numberOfInstallments,
      firstDueDate,
      sourceType,
    );
  }

  private async handlePayroll(transaction: any, metadata: any) {
    const dueDate = metadata.paymentDate ? new Date(metadata.paymentDate) : this.getDefaultDueDate(30);
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
  }

  private async handleOperatingExpense(transaction: any, metadata: any) {
    const dueDate = metadata.dueDate ? new Date(metadata.dueDate) : this.getDefaultDueDate(30);
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
  }

  private getDefaultDueDate(daysFromNow: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }
}

