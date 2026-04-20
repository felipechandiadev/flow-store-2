import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';

export interface CreateAccountingRuleDto {
  companyId: string;
  appliesTo: 'TRANSACTION' | 'TRANSACTION_LINE';
  transactionType: string;
  expenseCategoryId?: string;
  taxId?: string;
  paymentMethod?: string;
  debitAccountId: string;
  creditAccountId: string;
  priority: number;
  isActive?: boolean;
}

export interface UpdateAccountingRuleDto {
  expenseCategoryId?: string;
  taxId?: string;
  paymentMethod?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  priority?: number;
  isActive?: boolean;
}

@Injectable()
export class AccountingRulesService {
  constructor(
    @InjectRepository(AccountingRule)
    private rulesRepo: Repository<AccountingRule>,
  ) {}

  async create(dto: CreateAccountingRuleDto): Promise<AccountingRule> {
    const ruleData: any = {
      ...dto,
      isActive: dto.isActive ?? true,
    };
    const rule = await this.rulesRepo.save(ruleData);
    return rule;
  }

  async findAll(companyId: string): Promise<AccountingRule[]> {
    return this.rulesRepo.find({
      where: { companyId, isActive: true },
      order: { priority: 'ASC' },
    });
  }

  async findById(id: string): Promise<AccountingRule | null> {
    return this.rulesRepo.findOne({ where: { id } });
  }

  async update(
    id: string,
    dto: UpdateAccountingRuleDto,
  ): Promise<AccountingRule> {
    await this.rulesRepo.update(id, dto as any);
    return this.findById(id) as Promise<AccountingRule>;
  }

  async deactivate(id: string): Promise<void> {
    await this.rulesRepo.update(id, { isActive: false } as any);
  }

  async findByTransactionType(
    companyId: string,
    transactionType: string,
  ): Promise<AccountingRule[]> {
    return this.rulesRepo.find({
      where: { companyId, transactionType, isActive: true } as any,
      order: { priority: 'ASC' },
    });
  }
}
