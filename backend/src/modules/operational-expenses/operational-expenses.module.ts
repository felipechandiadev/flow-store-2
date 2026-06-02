import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OperationalExpense } from './domain/operational-expense.entity';
import { OperationalExpensesService } from './application/operational-expenses.service';
import { OperationalExpensesController } from './presentation/operational-expenses.controller';
import { OperationalExpensesRepository } from './infrastructure/operational-expenses.repository';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { Branch } from '@modules/branches/domain/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OperationalExpense, Branch]),
    CqrsModule,
    MultimediaModule,
    TransactionsModule,
  ],
  controllers: [OperationalExpensesController],
  providers: [OperationalExpensesService, OperationalExpensesRepository],
  exports: [OperationalExpensesService],
})
export class OperationalExpensesModule {}
