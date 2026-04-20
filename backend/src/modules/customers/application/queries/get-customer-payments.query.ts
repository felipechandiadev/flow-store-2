import { BaseQuery } from '@shared/cqrs';

export class GetCustomerPaymentsQuery extends BaseQuery {
  constructor(public readonly customerId: string) {
    super();
  }
}
