import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationalExpensesRepository } from '../infrastructure/operational-expenses.repository';
import { CreateOperationalExpenseDto } from './dto/create-operational-expense.dto';
import { UpdateOperationalExpenseDto } from './dto/update-operational-expense.dto';
import {
  OperationalExpense,
  OperationalExpenseLinkedTributaryDocument,
} from '../domain/operational-expense.entity';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import {
  TransactionStatus,
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { ParentPaymentAggregateService } from '@modules/transactions/application/services/parent-payment-aggregate.service';
import { Branch } from '@modules/branches/domain/branch.entity';

@Injectable()
export class OperationalExpensesService {
  private readonly logger = new Logger(OperationalExpensesService.name);

  constructor(
    private readonly repository: OperationalExpensesRepository,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly transactionsService: TransactionsService,
    private readonly parentPaymentAggregate: ParentPaymentAggregateService,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async findAll(params?: {
    limit?: number;
    offset?: number;
    companyId?: string;
    branchId?: string;
    status?: string;
  }): Promise<{ data: OperationalExpense[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      companyId,
      branchId,
      status,
    } = params || {};

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        where,
        take: limit,
        skip: offset,
        relations: [
          'company',
          'branch',
          'resultCenter',
          'category',
          'supplier',
          'employee',
        ],
        order: { createdAt: 'DESC' },
      }),
      this.repository.count({ where }),
    ]);

    const enrichedData = await Promise.all(
      data.map(async (expense) => this.attachMediaAssets(expense)),
    );

    return { data: enrichedData, total };
  }

  async findOne(id: string): Promise<OperationalExpense> {
    const expense = await this.repository.findOne(id);
    if (!expense) {
      throw new NotFoundException(`Operational expense ${id} not found`);
    }
    return this.attachMediaAssets(expense);
  }

  async create(dto: CreateOperationalExpenseDto): Promise<OperationalExpense> {
    this.logger.log(`Creating operational expense: ${dto.referenceNumber}`);
    const { multimediaAssetIds, ...expenseData } = dto;
    const created = await this.repository.create(expenseData);

    if (multimediaAssetIds?.length) {
      await Promise.all(
        multimediaAssetIds.map((assetId, index) =>
          this.multimediaService.link({
            assetId,
            entityType: 'operational-expense',
            entityId: created.id,
            usageType: 'attachment',
            sortOrder: index,
          }),
        ),
      );
    }

    const linked = created.metadata?.linkedTributaryDocument;
    if (linked?.plannedPayments?.length) {
      await this.materializeOperatingExpensePayments(created, linked);
    }

    return this.attachMediaAssets(
      (await this.repository.findOne(created.id)) ?? created,
    );
  }

  async update(
    id: string,
    dto: UpdateOperationalExpenseDto,
  ): Promise<OperationalExpense> {
    await this.findOne(id);
    this.logger.log(`Updating operational expense ${id}`);
    const { multimediaAssetIds, ...expenseData } = dto;
    const updated = await this.repository.update(id, expenseData);

    if (multimediaAssetIds) {
      const existingAssets = await this.multimediaService.listByEntity(
        'operational-expense',
        id,
      );

      await Promise.all(
        existingAssets.map((asset) =>
          this.multimediaService.unlink({
            assetId: asset.id,
            entityType: 'operational-expense',
            entityId: id,
          }),
        ),
      );

      await Promise.all(
        multimediaAssetIds.map((assetId, index) =>
          this.multimediaService.link({
            assetId,
            entityType: 'operational-expense',
            entityId: id,
            usageType: 'attachment',
            sortOrder: index,
          }),
        ),
      );
    }

    return this.attachMediaAssets(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    this.logger.log(`Removing operational expense ${id}`);
    await this.repository.remove(id);
  }

  private async materializeOperatingExpensePayments(
    expense: OperationalExpense,
    linked: OperationalExpenseLinkedTributaryDocument,
  ): Promise<void> {
    const schedule = linked.plannedPayments ?? [];
    if (!schedule.length) {
      return;
    }

    const branchId = await this.resolveBranchId(expense);
    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar sucursal para el gasto operativo',
      );
    }

    const totalDoc = Math.round(Number(linked.totalAmount) || 0);
    const sumSchedule = schedule.reduce(
      (s, l) => s + Math.round(Number(l.amount) || 0),
      0,
    );
    if (totalDoc > 0 && Math.abs(sumSchedule - totalDoc) > 2) {
      throw new BadRequestException(
        'Las cuotas del plan de pago deben sumar el total del documento',
      );
    }

    const expenseTotal = totalDoc > 0 ? totalDoc : sumSchedule;
    const net = Math.round(Number(linked.netAmount) || 0);
    const tax = Math.round(Number(linked.taxAmount) || 0);

    const opDto = new CreateTransactionDto();
    opDto.transactionType = TransactionType.OPERATING_EXPENSE;
    opDto.branchId = branchId;
    opDto.userId = expense.createdBy;
    opDto.expenseCategoryId = expense.categoryId;
    opDto.supplierId = expense.supplierId ?? undefined;
    opDto.subtotal = net > 0 ? net : expenseTotal;
    opDto.taxAmount = tax;
    opDto.discountAmount = 0;
    opDto.total = expenseTotal;
    opDto.amountPaid = 0;
    opDto.paymentStatus = PaymentStatus.PENDING;
    opDto.paymentDueDate = expense.operationDate;
    opDto.externalReference = linked.dteNumber ?? expense.referenceNumber ?? undefined;
    opDto.metadata = {
      origin: 'OPERATIONAL_EXPENSE',
      operationalExpenseId: expense.id,
      linkedTributaryDocument: linked,
    };

    const opTx = await this.transactionsService.createTransaction(opDto);
    const totalInstallments = schedule.length;

    for (let i = 0; i < schedule.length; i++) {
      const line = schedule[i];
      const amount = Math.round(Number(line.amount) || 0);
      if (amount <= 0) continue;

      const payDto = new CreateTransactionDto();
      payDto.transactionType = TransactionType.EXPENSE_PAYMENT;
      payDto.transactionStatus = TransactionStatus.DRAFT;
      payDto.branchId = branchId;
      payDto.userId = expense.createdBy;
      payDto.expenseCategoryId = expense.categoryId;
      payDto.supplierId = expense.supplierId ?? undefined;
      payDto.relatedTransactionId = opTx.id;
      payDto.subtotal = amount;
      payDto.taxAmount = 0;
      payDto.discountAmount = 0;
      payDto.total = amount;
      payDto.amountPaid = 0;
      payDto.paymentStatus = PaymentStatus.PENDING;
      payDto.paymentDueDate = String(line.dueDate || expense.operationDate).trim();
      payDto.metadata = {
        origin: 'EXPENSE_PAYMENT',
        installmentNumber: i + 1,
        totalInstallments,
        operatingExpenseId: expense.id,
        operatingExpenseTransactionId: opTx.id,
      };
      await this.transactionsService.createTransaction(payDto);
    }

    await this.parentPaymentAggregate.recalculateParentPaymentStatus(opTx.id);

    await this.repository.update(expense.id, {
      metadata: {
        ...(expense.metadata ?? {}),
        operatingExpenseTransactionId: opTx.id,
        linkedTributaryDocument: linked,
      },
    });
  }

  private async resolveBranchId(expense: OperationalExpense): Promise<string | null> {
    if (expense.branchId) {
      return expense.branchId;
    }
    const branch = await this.branchRepo.findOne({
      where: { companyId: expense.companyId },
      order: { name: 'ASC' },
    });
    return branch?.id ?? null;
  }

  private async attachMediaAssets(
    expense: OperationalExpense,
  ): Promise<OperationalExpense> {
    const assets = await this.multimediaService.listByEntity(
      'operational-expense',
      expense.id,
    );

    expense.mediaAssets = assets.map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    }));

    return expense;
  }
}
