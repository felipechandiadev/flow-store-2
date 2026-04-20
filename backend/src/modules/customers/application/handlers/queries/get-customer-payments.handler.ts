import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerPaymentsQuery } from '../../queries/get-customer-payments.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';

@QueryHandler(GetCustomerPaymentsQuery)
export class GetCustomerPaymentsHandler implements IQueryHandler<GetCustomerPaymentsQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: GetCustomerPaymentsQuery) {
    const { customerId } = query;

    const payments = await this.customerRepository.getTransactions(customerId);

    const mapped = payments.slice(0, 50).map((p) => ({
      id: p.id,
      documentNumber: (p as any).documentNumber || null,
      type: (p as any).transactionType || null,
      status: (p as any).status || null,
      total: Number((p as any).total ?? 0),
      paymentMethod: (p as any).paymentMethod || null,
      createdAt: p.createdAt,
    }));

    return {
      success: true,
      total: mapped.length,
      payments: mapped,
    };
  }
}
