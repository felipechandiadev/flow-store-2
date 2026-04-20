import { BaseCommand } from '@shared/cqrs';
import { SupplierType } from '../../domain/supplier.entity';

export class UpdateSupplierCommand extends BaseCommand {
  constructor(
    public readonly supplierId: string,
    public readonly userId: string,
    public readonly supplierType?: SupplierType,
    public readonly alias?: string,
    public readonly defaultPaymentTermDays?: number,
    public readonly isActive?: boolean,
    public readonly notes?: string,
  ) {
    super();
  }
}
