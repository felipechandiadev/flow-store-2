import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CompleteSupplierPaymentCommand } from '@modules/transactions/application/commands/complete-supplier-payment.command';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';
import { BranchOrmEntity } from '@modules/branches/infrastructure/orm-mappers/branch.orm-entity';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { DOCUMENT_PREFIXES } from '@shared/enums/document-prefixes';

@CommandHandler(CompleteSupplierPaymentCommand)
export class CompleteSupplierPaymentCommandHandler implements ICommandHandler<CompleteSupplierPaymentCommand> {
  private readonly logger = new Logger(
    CompleteSupplierPaymentCommandHandler.name,
  );

  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
    @InjectRepository(BranchOrmEntity)
    private readonly branchRepository: Repository<BranchOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CompleteSupplierPaymentCommand): Promise<Transaction> {
    this.logger.debug(`Completing supplier payment: ${command.paymentId}`);

    // Load payment with relations
    const payment = await this.transactionRepository.findOne({
      where: { id: command.paymentId },
      relations: ['branch', 'branch.company'],
    });

    if (!payment) {
      throw new BadRequestException(`Payment ${command.paymentId} not found`);
    }

    if (payment.transactionType !== TransactionType.PAYMENT_OUT) {
      throw new BadRequestException(
        `Transaction ${command.paymentId} is not a PAYMENT_OUT`,
      );
    }

    if (payment.status === TransactionStatus.CONFIRMED) {
      throw new ConflictException(
        `Payment ${command.paymentId} is already confirmed`,
      );
    }

    const pendingAmount = Number(payment.total) - Number(payment.amountPaid);
    if (pendingAmount <= 0) {
      throw new ConflictException(
        `Payment ${command.paymentId} has no pending amount`,
      );
    }

    const companyId = payment.branch?.company?.id;
    if (!companyId) {
      throw new BadRequestException(
        `Payment ${command.paymentId} has no associated company`,
      );
    }

    // Create payment execution in transaction
    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Update PAYMENT_OUT to CONFIRMED
      const updatedMetadata = {
        ...(payment.metadata || {}),
        completedAt: new Date().toISOString(),
        supplierBankAccount: command.supplierBankAccount,
        companyBankAccount: command.companyBankAccount,
      };

      await manager
        .getRepository(TransactionOrmEntity)
        .update(command.paymentId, {
          amountPaid: payment.total,
          status: TransactionStatus.CONFIRMED as any,
          paymentMethod: command.paymentMethod || payment.paymentMethod,
          bankAccountKey: command.bankAccountKey || payment.bankAccountKey,
          notes: command.note
            ? `${payment.notes || ''}\n${command.note}`.trim()
            : payment.notes,
          metadata: updatedMetadata as any,
        });

      this.logger.debug(
        `Payment ${command.paymentId} marked as CONFIRMED. Amount: ${payment.total}`,
      );

      // 2. Generate document number for PAYMENT_EXECUTION
      const executionDocNumber = await this.generateDocumentNumber(
        payment.branchId || '',
        TransactionType.PAYMENT_EXECUTION,
      );

      // 3. Create PAYMENT_EXECUTION transaction
      const paymentExecution = manager
        .getRepository(TransactionOrmEntity)
        .create({
          documentNumber: executionDocNumber,
          transactionType: TransactionType.PAYMENT_EXECUTION,
          status: TransactionStatus.CONFIRMED,
          branchId: payment.branchId,
          userId: payment.userId,
          relatedTransactionId: command.paymentId,
          supplierId: payment.supplierId,
          employeeId: payment.employeeId,
          total: payment.total,
          subtotal: payment.subtotal,
          taxAmount: 0,
          discountAmount: 0,
          paymentMethod: command.paymentMethod || payment.paymentMethod,
          amountPaid: payment.total,
          bankAccountKey: command.bankAccountKey || payment.bankAccountKey,
          accountingPeriodId: payment.accountingPeriodId,
          notes: command.note
            ? `Pago ejecutado: ${command.note}`
            : `Pago ejecutado de ${payment.documentNumber}`,
          metadata: {
            origin: 'PAYMENT_COMPLETION',
            paymentOutId: command.paymentId,
            paymentOutDocNumber: payment.documentNumber,
            supplierBankAccount: command.supplierBankAccount,
            companyBankAccount: command.companyBankAccount,
            completedAt: new Date().toISOString(),
            payrollLineType: payment.metadata?.payrollLineType,
            payrollTransactionId: payment.metadata?.payrollTransactionId,
          },
        });

      const savedExecution = await manager
        .getRepository(TransactionOrmEntity)
        .save(paymentExecution);

      this.logger.debug(
        `Payment execution ${savedExecution.id} created for payment ${command.paymentId}`,
      );

      return savedExecution;
    });

    // Emit event for accounting engine
    const domainTransaction = this.toDomain(result);
    const event = new TransactionCreatedEvent(domainTransaction, companyId);
    this.eventBus.publish(event);

    this.logger.debug(
      `Payment completion event emitted. Accounting engine will process.`,
    );

    return domainTransaction;
  }

  private async generateDocumentNumber(
    branchId: string,
    transactionType: string,
  ): Promise<string> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });

    if (!branch) {
      throw new BadRequestException(`Branch ${branchId} not found`);
    }

    const prefix = DOCUMENT_PREFIXES[transactionType] || 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `${prefix}-${branch.id.substring(0, 8)}-${timestamp}-${random}`;
  }

  private toDomain(orm: TransactionOrmEntity): Transaction {
    return {
      id: orm.id,
      documentNumber: orm.documentNumber,
      transactionType: orm.transactionType as any,
      status: orm.status as any,
      branchId: orm.branchId,
      userId: orm.userId,
      pointOfSaleId: orm.pointOfSaleId,
      cashSessionId: orm.cashSessionId,
      storageId: orm.storageId,
      targetStorageId: orm.targetStorageId,
      customerId: orm.customerId,
      supplierId: orm.supplierId,
      shareholderId: orm.shareholderId,
      employeeId: orm.employeeId,
      expenseCategoryId: orm.expenseCategoryId,
      resultCenterId: orm.resultCenterId,
      accountingPeriodId: orm.accountingPeriodId,
      subtotal: orm.subtotal,
      taxAmount: orm.taxAmount,
      discountAmount: orm.discountAmount,
      total: orm.total,
      paymentMethod: orm.paymentMethod as any,
      paymentStatus: orm.paymentStatus as any,
      bankAccountKey: orm.bankAccountKey,
      documentType: orm.documentType,
      documentFolio: orm.documentFolio,
      paymentDueDate: orm.paymentDueDate,
      amountPaid: orm.amountPaid,
      changeAmount: orm.changeAmount,
      relatedTransactionId: orm.relatedTransactionId,
      externalReference: orm.externalReference,
      notes: orm.notes,
      metadata: orm.metadata,
      createdAt: orm.createdAt,
    } as Transaction;
  }
}
