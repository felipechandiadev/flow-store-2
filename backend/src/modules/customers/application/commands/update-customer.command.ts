import { BaseCommand } from '@shared/cqrs';

export class UpdateCustomerCommand extends BaseCommand {
  constructor(
    public readonly customerId: string,
    public readonly userId: string,
    public readonly creditLimit?: number,
    public readonly paymentDayOfMonth?: number,
    public readonly notes?: string,
    public readonly isActive?: boolean,
  ) {
    super();
  }
}
