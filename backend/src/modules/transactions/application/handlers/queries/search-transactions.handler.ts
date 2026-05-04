import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

@QueryHandler(SearchTransactionsQuery)
export class SearchTransactionsQueryHandler implements IQueryHandler<SearchTransactionsQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(query: SearchTransactionsQuery): Promise<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.transactionRepository.createQueryBuilder('tx');

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 25), 200);

    // Load relations
    qb.leftJoinAndSelect('tx.branch', 'branch');
    qb.leftJoinAndSelect('tx.user', 'user');
    qb.leftJoinAndSelect('user.person', 'person');
    qb.leftJoinAndSelect('tx.customer', 'customer');
    qb.leftJoinAndSelect('tx.supplier', 'supplier');
    qb.leftJoinAndSelect('supplier.person', 'supplierPerson');
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
        '(tx.documentNumber LIKE :search OR tx.externalReference LIKE :search OR tx.documentFolio LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Get total count before pagination
    const total = await qb.getCount();

    // Apply pagination
    qb.skip((page - 1) * limit).take(limit);

    // Order by creation date descending
    qb.orderBy('tx.createdAt', 'DESC');

    const results = await qb.getMany();

    return {
      data: results,
      total,
      page,
      limit,
    };
  }
}
