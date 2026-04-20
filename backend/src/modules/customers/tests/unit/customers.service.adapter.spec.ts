import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CustomersServiceAdapter } from '@modules/customers/application/customers.service.adapter';
import { CreateCustomerCommand } from '@modules/customers/application/commands/create-customer.command';
import { UpdateCustomerCommand } from '@modules/customers/application/commands/update-customer.command';
import { DeleteCustomerCommand } from '@modules/customers/application/commands/delete-customer.command';
import { GetCustomerQuery } from '@modules/customers/application/queries/get-customer.query';
import { SearchCustomersQuery } from '@modules/customers/application/queries/search-customers.query';
import { GetCustomerPaymentsQuery } from '@modules/customers/application/queries/get-customer-payments.query';
import { GetCustomerPendingPaymentsQuery } from '@modules/customers/application/queries/get-customer-pending-payments.query';
import { GetCustomerPurchasesQuery } from '@modules/customers/application/queries/get-customer-purchases.query';

describe('CustomersServiceAdapter', () => {
  let service: CustomersServiceAdapter;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    service = new CustomersServiceAdapter(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  it('should dispatch CreateCustomerCommand and compose enriched response', async () => {
    const now = new Date();
    commandBus.execute.mockResolvedValueOnce({
      id: 'customer-1',
      personId: 'person-1',
      creditLimit: 1000,
      paymentDayOfMonth: 15,
      createdAt: now,
      updatedAt: now,
    });
    queryBus.execute.mockResolvedValueOnce({
      creditLimit: 1000,
      usedCredit: 250,
      displayName: 'John Doe',
      person: {
        documentType: 'RUT',
        documentNumber: '123',
        email: 'john@example.com',
        phone: '555',
        address: 'Main St',
      },
    });

    const result = await service.create({
      personType: 'NATURAL',
      firstName: 'John',
      lastName: 'Doe',
      businessName: undefined,
      documentNumber: '123',
      documentType: 'RUT',
      email: 'john@example.com',
      phone: '555',
      address: 'Main St',
      creditLimit: 1000,
      paymentDayOfMonth: 15,
      notes: 'notes',
    });

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(CreateCustomerCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      personType: 'NATURAL',
      firstName: 'John',
      userId: 'system-user',
      lastName: 'Doe',
      documentNumber: '123',
      documentType: 'RUT',
      email: 'john@example.com',
      phone: '555',
      address: 'Main St',
      creditLimit: 1000,
      paymentDayOfMonth: 15,
      notes: 'notes',
    });
    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetCustomerQuery);
    expect(queryBus.execute.mock.calls[0][0]).toMatchObject({ customerId: 'customer-1' });
    expect(result).toEqual({
      success: true,
      customer: {
        customerId: 'customer-1',
        personId: 'person-1',
        displayName: 'John Doe',
        documentType: 'RUT',
        documentNumber: '123',
        email: 'john@example.com',
        phone: '555',
        address: 'Main St',
        creditLimit: 1000,
        usedCredit: 250,
        availableCredit: 750,
        paymentDayOfMonth: 15,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  it('should dispatch UpdateCustomerCommand and map response', async () => {
    const now = new Date();
    commandBus.execute.mockResolvedValueOnce({
      id: 'customer-1',
      creditLimit: 500,
      paymentDayOfMonth: 20,
      notes: 'updated',
      isActive: true,
      updatedAt: now,
    });

    const result = await service.update('customer-1', {
      creditLimit: 500,
      paymentDayOfMonth: 20,
      notes: 'updated',
      isActive: true,
    });

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(UpdateCustomerCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      customerId: 'customer-1',
      userId: 'system-user',
      creditLimit: 500,
      paymentDayOfMonth: 20,
      notes: 'updated',
      isActive: true,
    });
    expect(result).toEqual({
      success: true,
      customer: {
        customerId: 'customer-1',
        creditLimit: 500,
        paymentDayOfMonth: 20,
        notes: 'updated',
        isActive: true,
        updatedAt: now,
      },
    });
  });

  it('should dispatch DeleteCustomerCommand', async () => {
    commandBus.execute.mockResolvedValueOnce({ success: true });

    await service.delete('customer-1');

    expect(commandBus.execute.mock.calls[0][0]).toBeInstanceOf(DeleteCustomerCommand);
    expect(commandBus.execute.mock.calls[0][0]).toMatchObject({
      customerId: 'customer-1',
      userId: 'system-user',
    });
  });

  it('should dispatch customer read queries', async () => {
    queryBus.execute.mockResolvedValue(undefined);

    await service.findOne('customer-1');
    await service.getPayments('customer-1');
    await service.search({ query: 'john', page: 2, pageSize: 5 });
    await service.getPendingPayments('customer-1');
    await service.getPurchases('customer-1', 'PAID');

    expect(queryBus.execute.mock.calls[0][0]).toBeInstanceOf(GetCustomerQuery);
    expect(queryBus.execute.mock.calls[1][0]).toBeInstanceOf(GetCustomerPaymentsQuery);
    expect(queryBus.execute.mock.calls[2][0]).toBeInstanceOf(SearchCustomersQuery);
    expect(queryBus.execute.mock.calls[2][0]).toMatchObject({
      query: 'john',
      page: 2,
      pageSize: 5,
    });
    expect(queryBus.execute.mock.calls[3][0]).toBeInstanceOf(GetCustomerPendingPaymentsQuery);
    expect(queryBus.execute.mock.calls[4][0]).toBeInstanceOf(GetCustomerPurchasesQuery);
    expect(queryBus.execute.mock.calls[4][0]).toMatchObject({
      customerId: 'customer-1',
      status: 'PAID',
    });
  });
});