import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EmployeesController } from './presentation/employees.controller';
import { EmployeesServiceAdapter } from './application/services/employees.service.adapter';
import { TypeOrmEmployeeRepository } from './infrastructure/repositories/typeorm-employee.repository';
import { EmployeeOrmEntity } from './infrastructure/orm-mappers/employee.orm-entity';
import { CompanyOrmEntity } from '@modules/companies/infrastructure/orm-mappers/company.orm-entity';
import { CreateEmployeeCommandHandler } from './application/handlers/commands/create-employee.handler';
import { UpdateEmployeeCommandHandler } from './application/handlers/commands/update-employee.handler';
import { DeleteEmployeeCommandHandler } from './application/handlers/commands/delete-employee.handler';
import { GetAllEmployeesQueryHandler } from './application/handlers/queries/get-all-employees.handler';
import { GetEmployeeByIdQueryHandler } from './application/handlers/queries/get-employee-by-id.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([EmployeeOrmEntity, CompanyOrmEntity]),
  ],
  controllers: [EmployeesController],
  providers: [
    EmployeesServiceAdapter,
    {
      provide: 'EmployeeRepositoryPort',
      useClass: TypeOrmEmployeeRepository,
    },
    CreateEmployeeCommandHandler,
    UpdateEmployeeCommandHandler,
    DeleteEmployeeCommandHandler,
    GetAllEmployeesQueryHandler,
    GetEmployeeByIdQueryHandler,
  ],
  exports: [EmployeesServiceAdapter],
})
export class EmployeesModule {}
