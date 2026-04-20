import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateEmployeeCommand } from '@modules/employees/application/commands/update-employee.command';
import { EmployeeRepositoryPort } from '@modules/employees/application/ports/employee.repository.port';
import { Employee } from '@modules/employees/domain/employee.entity';

@CommandHandler(UpdateEmployeeCommand)
export class UpdateEmployeeCommandHandler implements ICommandHandler<UpdateEmployeeCommand> {
  constructor(
    @Inject('EmployeeRepositoryPort')
    private readonly employeeRepository: EmployeeRepositoryPort,
  ) {}

  async execute(command: UpdateEmployeeCommand): Promise<Employee> {
    return this.employeeRepository.updateEmployee(command);
  }
}
