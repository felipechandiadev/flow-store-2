import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionOrmEntity } from '@modules/transactions/infrastructure/orm-mappers/transaction.orm-entity';

@QueryHandler(SearchTransactionsQuery)
export class SearchTransactionsQueryHandler implements IQueryHandler<SearchTransactionsQuery> {
  constructor(
    @InjectRepository(TransactionOrmEntity)
    private readonly transactionRepository: Repository<TransactionOrmEntity>,
  ) {}

  async execute(query: SearchTransactionsQuery): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.transactionRepository.createQueryBuilder('tx');

    // Load relations
    qb.leftJoinAndSelect('tx.branch', 'branch');
    qb.leftJoinAndSelect('tx.user', 'user');
    qb.leftJoinAndSelect('user.person', 'person');
    qb.leftJoinAndSelect('tx.customer', 'customer');
    qb.leftJoinAndSelect('tx.supplier', 'supplier');
    qb.leftJoinAndSelect('tx.pointOfSale', 'pos');
    qb.leftJoinAndSelect('tx.cashSession', 'cashSession');

    // Apply filters
    if (query.type) {
      qb.andWhere('tx.transactionType = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('tx.status = :status', { status: query.status });
    }

    if (query.paymentMethod) {
      qb.andWhere('tx.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }

    if (query.branchId) {
      qb.andWhere('tx.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.pointOfSaleId) {
      qb.andWhere('tx.pointOfSaleId = :posId', { posId: query.pointOfSaleId });
    }

    if (query.customerId) {
      qb.andWhere('tx.customerId = :customerId', {
        customerId: query.customerId,
      });
    }

    if (query.supplierId) {
      qb.andWhere('tx.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }

    // Date filtering
    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom);
      qb.andWhere('tx.createdAt >= :dateFrom', { dateFrom });
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      qb.andWhere('tx.createdAt <= :dateTo', { dateTo });
    }

    // Text search
    if (query.search) {
      qb.andWhere(
        '(tx.documentNumber LIKE :search OR tx.externalReference LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Get total count before pagination
    const total = await qb.getCount();

    // Apply pagination
    const skip = (query.page - 1) * query.limit;
    qb.skip(skip).take(query.limit);

    // Order by creation date descending
    qb.orderBy('tx.createdAt', 'DESC');

    const results = await qb.getMany();

    return {
      data: results.map((orm) => this.toDomain(orm)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  private toDomain(orm: TransactionOrmEntity): Transaction {
    return {
      id: orm.id,
      documentNumber: orm.documentNumber,
      transactionType: orm.transactionType,
      status: orm.status,
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
      paymentMethod: orm.paymentMethod,
      paymentStatus: orm.paymentStatus,
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
