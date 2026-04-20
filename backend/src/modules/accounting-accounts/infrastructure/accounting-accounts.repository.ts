import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingAccountOrmEntity } from './orm-mappers/accounting-account.orm-entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingAccountRepositoryPort } from '@modules/accounting-accounts/application/ports/accounting-account.repository.port';

@Injectable()
export class AccountingAccountsRepository implements AccountingAccountRepositoryPort {
  constructor(
    @InjectRepository(AccountingAccountOrmEntity)
    private readonly repo: Repository<AccountingAccountOrmEntity>,
  ) {}

  private toDomain(e: AccountingAccountOrmEntity): AccountingAccount {
    return new AccountingAccount({
      id: e.id,
      companyId: e.companyId,
      code: e.code,
      name: e.name,
      type: e.type,
      parentId: e.parentId,
      isActive: e.isActive,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }

  private toOrm(d: AccountingAccount): AccountingAccountOrmEntity {
    const e = new AccountingAccountOrmEntity();
    e.id = d.id;
    e.companyId = d.companyId;
    e.code = d.code;
    e.name = d.name;
    e.type = d.type as any;
    e.parentId = d.parentId as any;
    e.isActive = d.isActive;
    return e;
  }

  async save(account: AccountingAccount): Promise<AccountingAccount> {
    const orm = this.toOrm(account);
    const saved = await this.repo.save(orm as any);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<AccountingAccount | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findByCompany(companyId: string): Promise<AccountingAccount[]> {
    const found = await this.repo.find({ where: { companyId } });
    return found.map((f) => this.toDomain(f));
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
