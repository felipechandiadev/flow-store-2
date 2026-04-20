import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCustomerPendingPaymentsQuery } from '../../queries/get-customer-pending-payments.query';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';

@QueryHandler(GetCustomerPendingPaymentsQuery)
export class GetCustomerPendingPaymentsHandler implements IQueryHandler<GetCustomerPendingPaymentsQuery> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
  ) {}

  async execute(query: GetCustomerPendingPaymentsQuery) {
    const { customerId } = query;

    const pending =
      await this.customerRepository.getPendingPayments(customerId);

    // Map quotas if present; keep shape compatible with callers
    const mapped = pending.map((p) => ({
      transactionId: p.id,
      documentNumber: (p as any).documentNumber ?? null,
      transactionDate: p.createdAt,
      total: Number(p.total || 0),
      quotas: (p as any).quotas || [],
    }));

    return mapped;
  }
}
