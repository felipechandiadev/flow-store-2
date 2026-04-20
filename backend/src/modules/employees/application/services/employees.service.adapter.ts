import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateEmployeeCommand } from '../commands/create-employee.command';
import { UpdateEmployeeCommand } from '../commands/update-employee.command';
import { DeleteEmployeeCommand } from '../commands/delete-employee.command';
import { GetEmployeeByIdQuery } from '../queries/get-employee-by-id.query';
import { GetAllEmployeesQuery } from '../queries/get-all-employees.query';
import { Employee } from '../../domain/employee.entity';

@Injectable()
export class EmployeesServiceAdapter {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async getAllEmployees(params?: {
    includeTerminated?: boolean;
    status?: string;
    branchId?: string;
    companyId?: string;
  }): Promise<Employee[]> {
    return this.queryBus.execute(
      new GetAllEmployeesQuery(
        params?.includeTerminated,
        params?.status,
        params?.branchId,
        params?.companyId,
      ),
    );
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    return this.queryBus.execute(new GetEmployeeByIdQuery(id));
  }

  async createEmployee(data: {
    personId: string;
    companyId?: string;
    branchId?: string;
    resultCenterId?: string;
    organizationalUnitId?: string;
    employmentType: string;
    hireDate: string;
    baseSalary?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Employee> {
    return this.commandBus.execute(
      new CreateEmployeeCommand(
        data.personId,
        data.companyId,
        data.branchId,
        data.resultCenterId,
        data.organizationalUnitId,
        data.employmentType,
        data.hireDate,
        data.baseSalary,
        data.metadata,
      ),
    );
  }

  async updateEmployee(
    id: string,
    data: Partial<{
      branchId?: string | null;
      resultCenterId?: string | null;
      organizationalUnitId?: string | null;
      employmentType?: string;
      status?: string;
      terminationDate?: string | null;
      baseSalary?: string | null;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<Employee> {
    return this.commandBus.execute(
      new UpdateEmployeeCommand(
        id,
        data.branchId,
        data.resultCenterId,
        data.organizationalUnitId,
        data.employmentType,
        data.status,
        data.terminationDate,
        data.baseSalary,
        data.metadata,
      ),
    );
  }

  async deleteEmployee(id: string): Promise<{ success: true }> {
    return this.commandBus.execute(new DeleteEmployeeCommand(id));
  }
}
