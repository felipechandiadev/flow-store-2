import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetAllAccountingAccountsQuery } from './queries/get-all-accounting-accounts.query';
import { GetAccountingAccountByIdQuery } from './queries/get-accounting-account-by-id.query';

@Injectable()
export class AccountingAccountsServiceAdapter {
  constructor(private readonly queryBus: QueryBus) {}

  async getAllAccounts() {
    return this.queryBus.execute(new GetAllAccountingAccountsQuery());
  }

  async getAccountById(id: string) {
    return this.queryBus.execute(new GetAccountingAccountByIdQuery(id));
  }
}
