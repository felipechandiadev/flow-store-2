import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { Employee } from '@modules/employees/domain/employee.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';

const DEDUCTION_TYPE_IDS = new Set([
  'AFP',
  'HEALTH_INSURANCE',
  'INCOME_TAX',
  'UNEMPLOYMENT_INSURANCE',
  'LOAN_PAYMENT',
  'ADVANCE_PAYMENT',
  'UNION_FEE',
  'COURT_ORDER',
  'DEDUCTION_EXTRA',
  'ADJUSTMENT_NEG',
]);

interface RemunerationLineInput {
  typeId: string;
  amount: number;
}

@Injectable()
export class RemunerationsService {
  constructor(
    private readonly transactionsService: TransactionsService,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ResultCenter)
    private readonly resultCenterRepository: Repository<ResultCenter>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getRemunerationById(id: string) {
    const tx = await this.transactionRepository.findOne({
      where: { id, transactionType: TransactionType.PAYROLL },
      relations: ['employee', 'employee.person', 'resultCenter'],
    });

    if (!tx) {
      return null;
    }

    return this.formatRemuneration(tx);
  }

  async getAllRemunerations(params?: {
    employeeId?: string;
    status?: TransactionStatus;
  }) {
    const query = this.transactionRepository.createQueryBuilder('t');

    query.leftJoinAndSelect('t.employee', 'employee');
    query.leftJoinAndSelect('employee.person', 'person');
    query.leftJoinAndSelect('t.resultCenter', 'resultCenter');

    query.where('t.transactionType = :type', { type: TransactionType.PAYROLL });

    if (params?.employeeId) {
      query.andWhere('t.employeeId = :employeeId', {
        employeeId: params.employeeId,
      });
    }
    if (params?.status) {
      query.andWhere('t.status = :status', { status: params.status });
    }

    const remunerations = await query.orderBy('t.createdAt', 'DESC').getMany();

    return remunerations.map((tx) => this.formatRemuneration(tx));
  }

  async createRemuneration(data: {
    employeeId: string;
    resultCenterId?: string | null;
    date: string;
    lines: RemunerationLineInput[];
    userId?: string;
  }) {
    const employee = await this.employeeRepository.findOne({
      where: { id: data.employeeId },
      relations: ['person'],
    });
    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    const resultCenterId =
      data.resultCenterId ?? employee.resultCenterId ?? null;

    const branchId = await this.resolveBranchId(employee, resultCenterId);
    if (!branchId) {
      throw new BadRequestException('Branch not found for remuneration');
    }

    const userId = await this.resolveUserId(data.userId);

    const { totalEarnings, totalDeductions, netPayment, normalizedLines } =
      this.calculateTotals(data.lines);

    const metadata = {
      remuneration: true,
      payrollDate: data.date,
      lines: normalizedLines,
      totalEarnings,
      totalDeductions,
      netPayment,
    };

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.PAYROLL;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.employeeId = employee.id;
    dto.resultCenterId = resultCenterId ?? undefined;
    dto.subtotal = totalEarnings;
    dto.taxAmount = 0;
    dto.discountAmount = totalDeductions;
    dto.total = netPayment;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.amountPaid = netPayment;
    dto.paymentDueDate = data.date;
    dto.metadata = metadata;

    const created = await this.transactionsService.createTransaction(dto);
    return this.getRemunerationById(created.id);
  }

  async updateRemuneration(
    id: string,
    data: Partial<{
      date: string;
      status: TransactionStatus;
      resultCenterId?: string | null;
      lines: RemunerationLineInput[];
    }>,
  ) {
    const existing = await this.transactionRepository.findOne({
      where: { id, transactionType: TransactionType.PAYROLL },
    });
    if (!existing) {
      return null;
    }

    const updateData: Partial<Transaction> = {};

    if (data.status) {
      updateData.status = data.status;
    }
    if (typeof data.resultCenterId !== 'undefined') {
      updateData.resultCenterId = data.resultCenterId ?? null;
    }
    if (data.date) {
      updateData.paymentDueDate = new Date(data.date);
    }

    if (data.lines) {
      const { totalEarnings, totalDeductions, netPayment, normalizedLines } =
        this.calculateTotals(data.lines);
      updateData.subtotal = totalEarnings;
      updateData.discountAmount = totalDeductions;
      updateData.total = netPayment;
      updateData.metadata = {
        ...(existing.metadata ?? {}),
        remuneration: true,
        payrollDate: data.date ?? existing.metadata?.payrollDate,
        lines: normalizedLines,
        totalEarnings,
        totalDeductions,
        netPayment,
      };
    }

    await this.transactionRepository.update(id, updateData as any);
    return this.getRemunerationById(id);
  }

  async deleteRemuneration(id: string) {
    await this.transactionRepository.update(
      { id, transactionType: TransactionType.PAYROLL },
      { status: TransactionStatus.CANCELLED },
    );
    return { success: true };
  }

  private calculateTotals(lines: RemunerationLineInput[]) {
    let totalEarnings = 0;
    let totalDeductions = 0;

    const normalizedLines = lines.map((line) => {
      const category = DEDUCTION_TYPE_IDS.has(line.typeId)
        ? 'DEDUCTION'
        : 'EARNING';
      const amount = Number(line.amount) || 0;

      if (category === 'DEDUCTION') {
        totalDeductions += amount;
      } else {
        totalEarnings += amount;
      }

      return {
        typeId: line.typeId,
        amount,
        category,
      };
    });

    return {
      totalEarnings,
      totalDeductions,
      netPayment: totalEarnings - totalDeductions,
      normalizedLines,
    };
  }

  private formatRemuneration(tx: Transaction) {
    const person = tx.employee?.person;
    const employeeName = person
      ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
      : '';

    const metadata = tx.metadata ?? {};
    const payrollDate =
      metadata.payrollDate ?? tx.paymentDueDate ?? tx.createdAt;

    return {
      id: tx.id,
      date: payrollDate,
      employeeId: tx.employeeId ?? null,
      employeeName,
      resultCenterId: tx.resultCenterId ?? null,
      totalEarnings: Number(metadata.totalEarnings ?? tx.subtotal ?? 0),
      totalDeductions: Number(
        metadata.totalDeductions ?? tx.discountAmount ?? 0,
      ),
      netPayment: Number(metadata.netPayment ?? tx.total ?? 0),
      status: tx.status,
      createdAt: tx.createdAt,
      updatedAt: tx.createdAt,
      lines: metadata.lines ?? [],
    };
  }

  private async resolveBranchId(
    employee: Employee,
    resultCenterId?: string | null,
  ) {
    if (employee.branchId) {
      return employee.branchId;
    }

    if (resultCenterId) {
      const resultCenter = await this.resultCenterRepository.findOne({
        where: { id: resultCenterId },
      });
      if (resultCenter?.branchId) {
        return resultCenter.branchId;
      }
    }

    const branches = await this.branchRepository.find({
      order: { name: 'ASC' },
      take: 1,
    });

    return branches[0]?.id ?? null;
  }

  private async resolveUserId(userId?: string) {
    if (userId) {
      return userId;
    }

    const users = await this.userRepository.find({
      order: { userName: 'ASC' },
      take: 1,
    });

    if (!users[0]) {
      throw new BadRequestException('No users available to register payroll');
    }

    return users[0].id;
  }
}
