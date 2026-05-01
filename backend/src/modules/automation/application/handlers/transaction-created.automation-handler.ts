import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { AutomationEngine } from '../automation.engine';
import { AutomationEventType } from '../../domain/automation-event-type.enum';

@EventsHandler(TransactionCreatedEvent)
export class TransactionCreatedAutomationHandler
  implements IEventHandler<TransactionCreatedEvent>
{
  private readonly logger = new Logger(TransactionCreatedAutomationHandler.name);

  constructor(private readonly engine: AutomationEngine) {}

  async handle(event: TransactionCreatedEvent) {
    const enabled = process.env.AUTOMATION_ENGINE_ENABLED === 'true';
    if (!enabled) {
      return;
    }
    const companyId = event.companyId;
    if (!companyId) {
      this.logger.warn(`Missing companyId for transaction=${event.transaction?.id}`);
      return;
    }
    await this.engine.handle({
      companyId,
      eventType: AutomationEventType.TRANSACTION_CREATED,
      payload: event,
    });
  }
}

