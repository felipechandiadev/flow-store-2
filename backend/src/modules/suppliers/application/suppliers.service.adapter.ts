import { Injectable, Inject } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierCommand } from './commands/create-supplier.command';
import { UpdateSupplierCommand } from './commands/update-supplier.command';
import { RemoveSupplierCommand } from './commands/remove-supplier.command';

@Injectable()
export class SuppliersServiceAdapter extends SuppliersService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {
    super(null as any); // We won't use the legacy repository dependency
  }

  async create(dto: any) {
    const command = new CreateSupplierCommand(
      dto.personId,
      dto.supplierType,
      dto.defaultPaymentTermDays,
      'system-user', // userId
      dto.alias,
      dto.notes,
    );

    return this.commandBus.execute(command);
  }

  async update(id: string, dto: any) {
    const command = new UpdateSupplierCommand(
      id,
      'system-user', // userId
      dto.supplierType,
      dto.alias,
      dto.defaultPaymentTermDays,
      dto.isActive,
      dto.notes,
    );

    return this.commandBus.execute(command);
  }

  async remove(id: string) {
    const command = new RemoveSupplierCommand(id, 'system-user');
    await this.commandBus.execute(command);
  }

  // Keep other methods from parent class for compatibility
}
