import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../../domain/transaction.entity';
import { TransactionLine } from '../../../transaction-lines/domain/transaction-line.entity';
import { Branch } from '../../../branches/domain/branch.entity';
import { Customer } from '../../../customers/domain/customer.entity';
import { User } from '../../../users/domain/user.entity';
import { TransactionCreatedEvent } from '../../../../shared/events/transaction-created.event';
import { AccountingPeriodsService } from '../../../accounting-periods/application/accounting-periods.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { DocumentNumberService } from '../document-number.service';

export class CreateTransactionCommand {
  constructor(public readonly dto: CreateTransactionDto) {}
}

@Injectable()
@CommandHandler(CreateTransactionCommand)
export class CreateTransactionUseCase implements ICommandHandler<CreateTransactionCommand> {
  private logger = new Logger(CreateTransactionUseCase.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly accountingPeriodsService: AccountingPeriodsService,
    private readonly eventBus: EventBus,
    private readonly documentNumberService: DocumentNumberService,
  ) {}

  async execute(command: CreateTransactionCommand): Promise<Transaction> {
    const { dto } = command;

    // Paso 1: Validar DTO
    const validationErrors = dto.validate();
    if (validationErrors.length > 0) {
      throw new BadRequestException(
        `Validación fallida: ${validationErrors.join('; ')}`,
      );
    }

    // Paso Pre-transacción: Obtener branch y companyId fuera de la transacción
    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });

    if (!branch || !branch.companyId) {
      throw new BadRequestException(
        `Branch ${dto.branchId} not found or has no company. Cannot generate ledger entries.`,
      );
    }

    const userExists = await this.userRepository.exist({
      where: { id: dto.userId },
    });
    if (!userExists) {
      throw new BadRequestException(
        `Usuario no encontrado (userId inválido). Vuelva a iniciar sesión o verifique el id de usuario.`,
      );
    }

    const companyId = branch.companyId;

    // Paso 0: ASEGURAR período contable (APERTURA AUTOMÁTICA)
    const transactionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const accountingPeriod = await this.accountingPeriodsService.ensurePeriod(
      transactionDate,
      companyId,
    );

    this.logger.log(
      `Transaction will use accounting period: ${accountingPeriod.name} ` +
        `(${accountingPeriod.id}) - Status: ${accountingPeriod.status}`,
    );

    // Usar transacción DB para ATOMICIDAD
    return this.dataSource.transaction(async (manager) => {
      try {
        // Paso 2: Folio correlativo (SIGLA-YY-00001)
        const documentNumber = await this.documentNumberService.allocateNext(
          dto.branchId,
          dto.transactionType,
          manager,
        );

        // Paso 3-4: Crear y guardar Transaction en BD
        const initialStatus =
          dto.transactionType === TransactionType.PURCHASE_ORDER &&
          dto.transactionStatus === TransactionStatus.DRAFT
            ? TransactionStatus.DRAFT
            : TransactionStatus.CONFIRMED;

        const transactionData: any = {
          documentNumber,
          transactionType: dto.transactionType,
          status: initialStatus,
          branchId: dto.branchId,
          userId: dto.userId,
          pointOfSaleId: dto.pointOfSaleId || null,
          cashSessionId: dto.cashSessionId || null,
          storageId: dto.storageId || null,
          targetStorageId: dto.targetStorageId || null,
          customerId: dto.customerId || null,
          supplierId: dto.supplierId || null,
          shareholderId: dto.shareholderId || null,
          employeeId: dto.employeeId || null,
          expenseCategoryId: dto.expenseCategoryId || null,
          resultCenterId: dto.resultCenterId || null,
          accountingPeriodId: accountingPeriod.id,
          subtotal: dto.subtotal,
          taxAmount: dto.taxAmount,
          discountAmount: dto.discountAmount,
          total: dto.total,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentStatus,
          bankAccountKey: dto.bankAccountKey || null,
          cashHubId: dto.cashHubId || null,
          documentType: dto.documentType || null,
          documentFolio: dto.documentFolio || null,
          paymentDueDate: dto.paymentDueDate
            ? new Date(dto.paymentDueDate)
            : null,
          amountPaid: dto.amountPaid,
          changeAmount: dto.changeAmount || null,
          relatedTransactionId: dto.relatedTransactionId || null,
          externalReference: dto.externalReference || null,
          notes: dto.notes || null,
          metadata: dto.metadata || {},
        };

        const saveRepository = manager.getRepository(Transaction);
        const savedTx: Transaction = await saveRepository.save(transactionData);

        this.logger.log(
          `Transaction created: ${savedTx.id} (${savedTx.documentNumber}) ` +
            `type: ${savedTx.transactionType}`,
        );

        // Crear líneas de transacción si existen
        if (dto.lines && dto.lines.length > 0) {
          const lineRepo = manager.getRepository(TransactionLine);
          const lineEntities = dto.lines.map((line, index) =>
            lineRepo.create({
              transactionId: savedTx.id,
              productId: line.productId,
              productVariantId: line.productVariantId,
              unitId: line.unitId,
              taxId: line.taxId,
              lineNumber: index + 1,
              productName: line.productName,
              productSku: line.productSku,
              variantName: line.variantName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              unitCost: line.unitCost,
              discountPercentage: line.discountPercentage,
              discountAmount: line.discountAmount,
              taxRate: (() => {
                let rate = Number(line.taxRate) || 0;
                if (rate > 100) {
                  rate = rate / 100;
                }
                return Math.max(0, Math.min(rate, 100));
              })(),
              taxAmount: line.taxAmount,
              subtotal: line.subtotal,
              total: line.total,
              notes: line.notes,
            }),
          );
          await lineRepo.save(lineEntities);
        }

        // Actualizar saldo de crédito del cliente cuando la venta usa crédito interno
        if (
          savedTx.transactionType === TransactionType.SALE &&
          savedTx.customerId
        ) {
          const paymentDetails = Array.isArray(savedTx.metadata?.paymentDetails)
            ? savedTx.metadata?.paymentDetails
            : [];

          const creditPayment = paymentDetails.find(
            (p) => p.method === 'CREDIT',
          );
          if (creditPayment && creditPayment.amount > 0) {
            const customerRepo = manager.getRepository(Customer);
            await customerRepo.increment(
              { id: savedTx.customerId },
              'currentBalance',
              creditPayment.amount,
            );
          }
        }

        // Paso 5: EMITIR evento 'transaction.created'
        // Get companyId from branch
        const branch = await this.transactionsRepository.manager
          .getRepository('Branch')
          .findOne({ where: { id: command.dto.branchId } });
        const companyId = branch?.companyId;

        this.eventBus.publish(new TransactionCreatedEvent(savedTx, companyId));

        return savedTx;
      } catch (error) {
        this.logger.error(
          `Error creating transaction: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    });
  }

}
