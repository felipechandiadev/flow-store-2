import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';

@Controller('production-batches')
export class ProductionBatchesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get()
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.max(1, parseInt(limit || '25', 10) || 25);
    return this.queryBus.execute(new SearchTransactionsQuery(p, l, TransactionType.PRODUCTION_BATCH));
  }

  @Post()
  async create(@Body() body: any) {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.PRODUCTION_BATCH;
    dto.branchId = body.branchId;
    dto.userId = body.userId;
    dto.storageId = body.storageId ?? undefined;
    dto.subtotal = 0;
    dto.total = 0;
    dto.notes = body.notes ?? undefined;
    dto.relatedTransactionId = body.orderId ?? body.relatedTransactionId ?? undefined;
    dto.metadata = {
      ...(body.metadata ?? {}),
      origin: 'PRODUCTION_BATCH',
      links: {
        orderId: body.orderId ?? body?.metadata?.links?.orderId ?? null,
        recipeId: body.recipeId ?? body?.metadata?.links?.recipeId ?? null,
        ...(body?.metadata?.links ?? {}),
      },
    };
    dto.lines = Array.isArray(body.lines) ? body.lines : [];
    return this.transactionsService.createTransaction(dto);
  }
}

