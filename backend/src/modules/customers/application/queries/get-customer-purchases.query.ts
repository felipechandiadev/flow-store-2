import { BaseQuery } from '@shared/cqrs';

export class GetCustomerPurchasesQuery extends BaseQuery {
  constructor(
    public readonly customerId: string,
    public readonly status?: string,
  ) {
    super();
  }
}
