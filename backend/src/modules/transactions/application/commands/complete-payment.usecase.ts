import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';
import { TransactionCreatedEvent } from '../../../../shared/events/transaction-created.event';
import { DocumentNumberService } from '../document-number.service';

export class CompletePaymentCommand {
  constructor(
    public readonly paymentId: string,
    public readonly data: {
      paymentMethod?: string;
      bankAccountKey?: string;
      supplierBankAccount?: any;
      companyBankAccount?: any;
      note?: string;
    },
  ) {}
}

@Injectable()
@CommandHandler(CompletePaymentCommand)
export class CompletePaymentUseCase implements ICommandHandler<CompletePaymentCommand> {
  private logger = new Logger(CompletePaymentUseCase.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly eventBus: EventBus,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  async execute(command: CompletePaymentCommand): Promise<Transaction> {
    const { paymentId, data } = command;

    // Cargar payment con relaciones necesarias para crear PAYMENT_EXECUTION
    const payment = await this.transactionsRepository.findOne({
      where: { id: paymentId },
      relations: ['branch', 'branch.company'],
    });

    if (!payment) {
      throw new BadRequestException(`Payment ${paymentId} not found`);
    }

    if (
      payment.transactionType !== TransactionType.SUPPLIER_PAYMENT &&
      payment.transactionType !== TransactionType.PAYROLL_PAYMENT
    ) {
      throw new BadRequestException(
        `Transaction ${paymentId} is not a completable supplier or payroll payment`,
      );
    }

    if (payment.status === TransactionStatus.CONFIRMED) {
      throw new ConflictException(`Payment ${paymentId} is already confirmed`);
    }

    const pendingAmount = Number(payment.total) - Number(payment.amountPaid);
    if (pendingAmount <= 0) {
      throw new ConflictException(`Payment ${paymentId} has no pending amount`);
    }

    // 1. Actualizar documento de pago (SUPPLIER_PAYMENT / PAYROLL_PAYMENT)
    const updatedMetadata = {
      ...(payment.metadata || {}),
      completedAt: new Date().toISOString(),
      supplierBankAccount: data.supplierBankAccount,
      companyBankAccount: data.companyBankAccount,
    };

    await this.transactionsRepository.update(paymentId, {
      amountPaid: payment.total,
      status: TransactionStatus.CONFIRMED,
      paymentMethod: (data.paymentMethod as any) || payment.paymentMethod,
      bankAccountKey: data.bankAccountKey || payment.bankAccountKey,
      notes: data.note
        ? `${payment.notes || ''}\n${data.note}`.trim()
        : payment.notes,
      metadata: updatedMetadata as any,
    });

    this.logger.log(
      `Payment ${paymentId} marked as CONFIRMED. Amount: ${payment.total}`,
    );

    // 2. Crear transacción PAYMENT_EXECUTION
    const paymentMethod = (data.paymentMethod as any) || payment.paymentMethod;

    if (!payment.branchId) {
      throw new BadRequestException(`Payment ${paymentId} has no branchId`);
    }

    const executionDocNumber = await this.documentNumberService.allocateNext(
      payment.branchId,
      TransactionType.PAYMENT_EXECUTION,
    );

    const paymentExecution = this.transactionsRepository.create({
      documentNumber: executionDocNumber,
      transactionType: TransactionType.PAYMENT_EXECUTION,
      status: TransactionStatus.CONFIRMED,
      branchId: payment.branchId,
      userId: payment.userId,
      relatedTransactionId: paymentId, // Enlace al pago origen (SUPPLIER_PAYMENT / PAYROLL_PAYMENT)
      supplierId: payment.supplierId,
      employeeId: payment.employeeId,
      total: payment.total,
      subtotal: payment.subtotal,
      taxAmount: 0,
      discountAmount: 0,
      paymentMethod: paymentMethod,
      amountPaid: payment.total, // Ya está pagado
      bankAccountKey: data.bankAccountKey || payment.bankAccountKey,
      accountingPeriodId: payment.accountingPeriodId,
      notes: data.note
        ? `Pago ejecutado: ${data.note}`
        : `Pago ejecutado de ${payment.documentNumber}`,
      metadata: {
        origin: 'PAYMENT_COMPLETION',
        sourcePaymentId: paymentId,
        sourcePaymentDocNumber: payment.documentNumber,
        paymentOutId: paymentId,
        paymentOutDocNumber: payment.documentNumber,
        supplierBankAccount: data.supplierBankAccount,
        companyBankAccount: data.companyBankAccount,
        completedAt: new Date().toISOString(),
        // Copiar metadata crítico desde el pago origen para contabilidad
        payrollLineType: payment.metadata?.payrollLineType,
        payrollTransactionId: payment.metadata?.payrollTransactionId,
      },
    });

    const savedExecution =
      await this.transactionsRepository.save(paymentExecution);

    this.logger.log(
      `Created PAYMENT_EXECUTION ${savedExecution.id} for payment ${paymentId}. Doc: ${executionDocNumber}`,
    );

    // 3. Emitir evento para generar asientos contables
    if (payment.branch?.company?.id) {
      // Get companyId from branch
      const branch = await this.transactionsRepository.manager
        .getRepository('Branch')
        .findOne({ where: { id: savedExecution.branchId } });
      const companyId = branch?.companyId;

      this.eventBus.publish(
        new TransactionCreatedEvent(savedExecution, companyId),
      );

      this.logger.log(
        `Emitted 'transaction.created' event for PAYMENT_EXECUTION ${savedExecution.id}. ` +
          `AccountingEngineListener will generate ledger entries automatically.`,
      );
    } else {
      this.logger.warn(
        `Could not emit 'transaction.created' event for PAYMENT_EXECUTION ${savedExecution.id}: ` +
          `branch.company not loaded. Ledger entries will NOT be generated.`,
      );
    }

    // 4. Retornar el pago origen actualizado
    return this.findOne(paymentId);
  }

  private async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { id },
      relations: [
        'branch',
        'pointOfSale',
        'cashSession',
        'customer',
        'customer.person',
        'supplier',
        'supplier.person',
        'expenseCategory',
        'resultCenter',
        'shareholder',
        'employee',
        'user',
        'user.person',
        'storageEntry',
        'targetStorageEntry',
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.unit',
        'lines.tax',
      ],
    });

    if (!transaction) {
      throw new BadRequestException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

}
