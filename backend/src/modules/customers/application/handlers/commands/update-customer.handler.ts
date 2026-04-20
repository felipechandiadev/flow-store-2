import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCustomerCommand } from '../../commands/update-customer.command';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import { CustomerUpdatedEvent } from '@modules/customers/domain/events/customer-updated.event';

@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateCustomerCommand) {
    const {
      customerId,
      creditLimit,
      paymentDayOfMonth,
      notes,
      isActive,
      userId,
    } = command;

    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const updateData: Partial<any> = {};
    if (creditLimit !== undefined) updateData.creditLimit = creditLimit;
    if (paymentDayOfMonth !== undefined)
      updateData.paymentDayOfMonth = paymentDayOfMonth;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCustomer = await this.customerRepository.update(
      customerId,
      updateData,
    );

    // Emit domain event
    this.eventBus.publish(new CustomerUpdatedEvent(customerId, userId));

    return updatedCustomer;
  }
}
