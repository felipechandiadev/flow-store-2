export class SearchTransactionsQuery {
  constructor(
    readonly page: number = 1,
    readonly limit: number = 25,
    readonly type?: string,
    readonly status?: string,
    readonly paymentMethod?: string,
    readonly branchId?: string,
    readonly pointOfSaleId?: string,
    readonly customerId?: string,
    readonly supplierId?: string,
    readonly dateFrom?: string,
    readonly dateTo?: string,
    readonly search?: string,
  ) {}
}

import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../domain/transaction.entity';

export interface SearchTransactionsResult {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
@QueryHandler(SearchTransactionsQuery)
export class SearchTransactionsQueryHandler implements IQueryHandler<SearchTransactionsQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(
    query: SearchTransactionsQuery,
  ): Promise<SearchTransactionsResult> {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 200);

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.branch', 'branch')
      .leftJoinAndSelect('t.pointOfSale', 'pointOfSale')
      .leftJoinAndSelect('t.cashSession', 'cashSession')
      .leftJoinAndSelect('t.customer', 'customer')
      .leftJoinAndSelect('customer.person', 'customerPerson')
      .leftJoinAndSelect('t.supplier', 'supplier')
      .leftJoinAndSelect('supplier.person', 'supplierPerson')
      .leftJoinAndSelect('t.expenseCategory', 'expenseCategory')
      .leftJoinAndSelect('t.resultCenter', 'resultCenter')
      .leftJoinAndSelect('t.user', 'user')
      .leftJoinAndSelect('user.person', 'userPerson')
      .leftJoinAndSelect('t.relatedTransaction', 'relatedTxn');

    if (query.type) {
      qb.andWhere('t.transactionType = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.paymentMethod) {
      qb.andWhere('t.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }
    if (query.branchId) {
      qb.andWhere('t.branchId = :branchId', { branchId: query.branchId });
    }
    if (query.pointOfSaleId) {
      qb.andWhere('t.pointOfSaleId = :pointOfSaleId', {
        pointOfSaleId: query.pointOfSaleId,
      });
    }
    if (query.customerId) {
      qb.andWhere('t.customerId = :customerId', {
        customerId: query.customerId,
      });
    }
    if (query.supplierId) {
      qb.andWhere('t.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }
    if (query.dateFrom) {
      const parsed = new Date(query.dateFrom);
      if (!Number.isNaN(parsed.getTime())) {
        qb.andWhere('t.createdAt >= :dateFrom', { dateFrom: parsed });
      }
    }
    if (query.dateTo) {
      const parsed = new Date(query.dateTo);
      if (!Number.isNaN(parsed.getTime())) {
        qb.andWhere('t.createdAt <= :dateTo', { dateTo: parsed });
      }
    }
    if (query.search) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(t.documentNumber LIKE :search OR t.externalReference LIKE :search)',
        { search },
      );
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
