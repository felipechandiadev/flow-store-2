import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ExpenseCategoriesRepository } from '../infrastructure/expense-categories.repository';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { ExpenseCategory } from '../domain/expense-category.entity';

@Injectable()
export class ExpenseCategoriesService {
  private readonly logger = new Logger(ExpenseCategoriesService.name);

  constructor(private readonly repository: ExpenseCategoriesRepository) {}

  async findAll(params?: {
    limit?: number;
    offset?: number;
    companyId?: string;
    isActive?: boolean;
  }): Promise<{ data: ExpenseCategory[]; total: number }> {
    const { limit = 50, offset = 0, companyId, isActive } = params || {};

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        where,
        take: limit,
        skip: offset,
        relations: ['company', 'defaultResultCenter'],
        order: { createdAt: 'DESC' },
      }),
      this.repository.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<ExpenseCategory> {
    const category = await this.repository.findOne(id);
    if (!category) {
      throw new NotFoundException(`Expense category ${id} not found`);
    }
    return category;
  }

  async create(dto: CreateExpenseCategoryDto): Promise<ExpenseCategory> {
    this.logger.log(`Creating expense category: ${dto.name}`);
    const data: any = { ...dto };
    if (dto.approvalThreshold !== undefined) {
      data.approvalThreshold = dto.approvalThreshold.toString();
    }
    return this.repository.create(data);
  }

  async update(
    id: string,
    dto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategory> {
    const category = await this.findOne(id);
    this.logger.log(`Updating expense category ${id}`);
    const data: any = { ...dto };
    if (dto.approvalThreshold !== undefined) {
      data.approvalThreshold = dto.approvalThreshold.toString();
    }
    return this.repository.update(id, data);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    this.logger.log(`Removing expense category ${id}`);
    await this.repository.remove(id);
  }
}
