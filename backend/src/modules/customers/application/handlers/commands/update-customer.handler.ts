import { Inject, BadRequestException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCustomerCommand } from '../../commands/update-customer.command';
import {
  CustomersRepositoryPort,
  CUSTOMERS_REPOSITORY,
} from '../../ports/customers.repository.port';
import { CustomerUpdatedEvent } from '@modules/customers/domain/events/customer-updated.event';
import { CompaniesService } from '@modules/companies/application/companies.service';

@CommandHandler(UpdateCustomerCommand)
export class UpdateCustomerHandler implements ICommandHandler<UpdateCustomerCommand> {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customerRepository: CustomersRepositoryPort,
    private readonly eventBus: EventBus,
    private readonly companiesService: CompaniesService,
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

    if (creditLimit !== undefined) {
      const icc = await this.companiesService.getInternalCustomerCreditSettings(
        customer.companyId,
      );
      const lim = Number(creditLimit) || 0;
      if (!icc.enabled && lim > 0) {
        throw new BadRequestException(
          'El crédito interno está deshabilitado para esta empresa; el límite de crédito debe ser 0.',
        );
      }
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
