import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountingAccountOrmEntity } from './infrastructure/orm-mappers/accounting-account.orm-entity';
import { CompaniesModule } from '@modules/companies/companies.module';
import { AccountingService } from '@modules/accounting/application/accounting.service';
import { AccountingController } from '@modules/accounting/presentation/accounting.controller';
import { AccountingAccountsRepository } from './infrastructure/accounting-accounts.repository';
import { ACCOUNTING_ACCOUNT_REPOSITORY } from './application/ports/accounting-account.repository.port';
import { AccountingAccountsServiceAdapter } from './application/accounting-accounts.service.adapter';
import { AccountingAccountsController } from './presentation/accounting-accounts.controller';
import { GetAllAccountingAccountsQueryHandler } from './application/handlers/queries/get-all-accounting-accounts.handler';
import { GetAccountingAccountByIdQueryHandler } from './application/handlers/queries/get-accounting-account-by-id.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([AccountingAccountOrmEntity]),
    CompaniesModule,
  ],
  controllers: [AccountingController, AccountingAccountsController],
  providers: [
    AccountingService,
    AccountingAccountsServiceAdapter,
    {
      provide: ACCOUNTING_ACCOUNT_REPOSITORY,
      useClass: AccountingAccountsRepository,
    },
    {
      provide: 'AccountingAccountRepositoryPort',
      useClass: AccountingAccountsRepository,
    },
    GetAllAccountingAccountsQueryHandler,
    GetAccountingAccountByIdQueryHandler,
  ],
  exports: [AccountingService, AccountingAccountsServiceAdapter],
})
export class AccountingAccountsModule {}
