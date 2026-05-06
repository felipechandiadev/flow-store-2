import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CustomersService } from './customers.service';
import { UpdateCustomerCommand } from './commands/update-customer.command';
import { DeleteCustomerCommand } from './commands/delete-customer.command';
import { GetCustomerPaymentsQuery } from './queries/get-customer-payments.query';
import { GetCustomerPendingPaymentsQuery } from './queries/get-customer-pending-payments.query';
import { GetCustomerPurchasesQuery } from './queries/get-customer-purchases.query';

@Injectable()
export class CustomersServiceAdapter extends CustomersService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    /** Servicio legacy con creación y persona persistidas (el bus CQRS usa handlers incompletos). */
    private readonly customersCore: CustomersService,
  ) {
    super(null as any, null as any, null as any); // We won't use the legacy dependencies
  }

  async create(createCustomerDto: any) {
    return this.customersCore.create(createCustomerDto);
  }

  async update(customerId: string, updateData: any) {
    const command = new UpdateCustomerCommand(
      customerId,
      'system-user', // userId
      updateData.creditLimit,
      updateData.paymentDayOfMonth,
      updateData.notes,
      updateData.isActive,
    );

    const result = await this.commandBus.execute(command);

    return {
      success: true,
      customer: {
        customerId: result.id,
        creditLimit: result.creditLimit,
        paymentDayOfMonth: result.paymentDayOfMonth,
        notes: result.notes,
        isActive: result.isActive,
        updatedAt: result.updatedAt,
      },
    };
  }

  async delete(customerId: string) {
    const command = new DeleteCustomerCommand(customerId, 'system-user');
    return this.commandBus.execute(command);
  }

  async findOne(id: string) {
    return this.customersCore.findOne(id);
  }

  async getPayments(customerId: string) {
    const query = new GetCustomerPaymentsQuery(customerId);
    return this.queryBus.execute(query);
  }

  async search(dto: any) {
    return this.customersCore.search(dto);
  }

  async getPendingPayments(customerId: string) {
    const query = new GetCustomerPendingPaymentsQuery(customerId);
    return this.queryBus.execute(query);
  }

  async getPurchases(customerId: string, status?: string) {
    const query = new GetCustomerPurchasesQuery(customerId, status);
    return this.queryBus.execute(query);
  }
}
