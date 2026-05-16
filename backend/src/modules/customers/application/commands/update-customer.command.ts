import { BaseCommand } from '@shared/cqrs';

export class UpdateCustomerCommand extends BaseCommand {
  constructor(
    public readonly customerId: string,
    public readonly userId: string,
    public readonly creditLimit?: number,
    public readonly paymentDayOfMonth?: number,
    public readonly notes?: string,
    public readonly isActive?: boolean,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly businessName?: string,
    public readonly documentType?: 'RUN' | 'RUT' | 'PASSPORT' | 'DNI',
    public readonly documentNumber?: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly address?: string,
  ) {
    super();
  }
}
