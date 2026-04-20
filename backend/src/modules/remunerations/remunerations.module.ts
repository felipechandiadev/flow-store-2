import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { RemunerationsService } from './application/remunerations.service';
import { RemunerationsController } from './presentation/remunerations.controller';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import { Remuneration } from './domain/remuneration.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { TypeOrmRemunerationRepository } from './infrastructure/repositories/typeorm-remuneration.repository';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      Transaction,
      Employee,
      ResultCenter,
      Branch,
      User,
      Remuneration,
    ]),
    TransactionsModule,
  ],
  controllers: [RemunerationsController],
  providers: [
    RemunerationsService,
    {
      provide: 'RemunerationRepositoryPort',
      useClass: TypeOrmRemunerationRepository,
    },
  ],
  exports: [RemunerationsService],
})
export class RemunerationsModule {}
