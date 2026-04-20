import { Injectable, Inject } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CustomersService } from './customers.service';
import { CreateCustomerCommand } from './commands/create-customer.command';
import { UpdateCustomerCommand } from './commands/update-customer.command';
import { DeleteCustomerCommand } from './commands/delete-customer.command';
import { SearchCustomersQuery } from './queries/search-customers.query';
import { GetCustomerQuery } from './queries/get-customer.query';
import { GetCustomerPaymentsQuery } from './queries/get-customer-payments.query';
import { GetCustomerPendingPaymentsQuery } from './queries/get-customer-pending-payments.query';
import { GetCustomerPurchasesQuery } from './queries/get-customer-purchases.query';

@Injectable()
export class CustomersServiceAdapter extends CustomersService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {
    super(null as any, null as any, null as any); // We won't use the legacy dependencies
  }

  async create(createCustomerDto: any) {
    const command = new CreateCustomerCommand(
      createCustomerDto.personType,
      createCustomerDto.firstName,
      'system-user', // userId
      createCustomerDto.lastName,
      createCustomerDto.businessName,
      createCustomerDto.documentNumber,
      createCustomerDto.documentType,
      createCustomerDto.email,
      createCustomerDto.phone,
      createCustomerDto.address,
      createCustomerDto.creditLimit,
      createCustomerDto.paymentDayOfMonth,
      createCustomerDto.notes,
    );

    const result = await this.commandBus.execute(command);

    // After creating, fetch the customer read model (which should include person fields)
    const customerFull = await this.queryBus.execute(
      new GetCustomerQuery(result.id),
    );

    const creditInfo = {
      creditLimit: customerFull.creditLimit ?? result.creditLimit,
      usedCredit: customerFull.usedCredit ?? 0,
      availableCredit:
        (customerFull.creditLimit ?? result.creditLimit) -
        (customerFull.usedCredit ?? 0),
    };

    const displayName =
      customerFull.displayName ||
      this.buildDisplayNameFromPerson(customerFull.person);

    return {
      success: true,
      customer: {
        customerId: result.id,
        personId: result.personId,
        displayName,
        documentType: customerFull.person?.documentType ?? null,
        documentNumber: customerFull.person?.documentNumber ?? null,
        email: customerFull.person?.email ?? null,
        phone: customerFull.person?.phone ?? null,
        address: customerFull.person?.address ?? null,
        creditLimit: creditInfo.creditLimit,
        usedCredit: creditInfo.usedCredit,
        availableCredit: creditInfo.availableCredit,
        paymentDayOfMonth: result.paymentDayOfMonth,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    };
  }

  private buildDisplayNameFromPerson(person: any) {
    if (!person) return '';
    if (person.type === 'BUSINESS') return person.businessName || '';
    return `${person.firstName || ''} ${person.lastName || ''}`.trim();
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
    const query = new GetCustomerQuery(id);
    return this.queryBus.execute(query);
  }

  async getPayments(customerId: string) {
    const query = new GetCustomerPaymentsQuery(customerId);
    return this.queryBus.execute(query);
  }

  async search(dto: any) {
    const query = new SearchCustomersQuery(dto.query, dto.page, dto.pageSize);
    return this.queryBus.execute(query);
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
