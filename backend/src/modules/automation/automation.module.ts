import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { AutomationRule } from './domain/automation-rule.entity';
import { AutomationAction } from './domain/automation-action.entity';
import { AutomationRulesController } from './presentation/automation-rules.controller';
import { AutomationRulesService } from './application/automation-rules.service';
import { AutomationEngine } from './application/automation.engine';
import { TransactionCreatedAutomationHandler } from './application/handlers/transaction-created.automation-handler';
import { CreateDerivedTransactionActionHandler } from './application/handlers/actions/create-derived-transaction.action';
import { TransactionsModule } from '@modules/transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule, AutomationAction]),
    CqrsModule,
    TransactionsModule,
  ],
  controllers: [AutomationRulesController],
  providers: [
    AutomationRulesService,
    AutomationEngine,
    TransactionCreatedAutomationHandler,
    CreateDerivedTransactionActionHandler,
  ],
  exports: [AutomationRulesService, AutomationEngine],
})
export class AutomationModule {}

