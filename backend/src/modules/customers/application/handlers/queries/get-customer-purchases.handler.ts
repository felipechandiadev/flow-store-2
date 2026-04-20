import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerPurchasesQuery } from '../../queries/get-customer-purchases.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';

@QueryHandler(GetCustomerPurchasesQuery)
export class GetCustomerPurchasesHandler implements IQueryHandler<GetCustomerPurchasesQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: GetCustomerPurchasesQuery) {
    const { customerId, status } = query;

    const purchases = await this.customerRepository.getPurchases(
      customerId,
      status,
    );

    return purchases.map((p) => ({
      id: p.id,
      documentNumber: (p as any).documentNumber ?? null,
      status: p.status,
      total: Number(p.total || 0),
      createdAt: p.createdAt,
    }));
  }
}
