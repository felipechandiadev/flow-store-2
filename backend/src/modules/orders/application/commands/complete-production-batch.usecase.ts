import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { RecipesService } from '@modules/recipes/application/recipes.service';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { CreateTransactionDto, CreateTransactionLineDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { RecipeType } from '@modules/recipes/domain/recipe-type.enum';

export class CompleteProductionBatchCommand {
  constructor(public readonly productionBatchId: string) {}
}

@Injectable()
@CommandHandler(CompleteProductionBatchCommand)
export class CompleteProductionBatchUseCase implements ICommandHandler<CompleteProductionBatchCommand> {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly txLineRepo: Repository<TransactionLine>,
    private readonly recipesService: RecipesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async execute(command: CompleteProductionBatchCommand): Promise<{
    productionBatchId: string;
    stockOutInputsTransactionId?: string | null;
    stockInOutputTransactionId?: string | null;
  }> {
    const batch = await this.txRepo.findOne({ where: { id: command.productionBatchId } });
    if (!batch) throw new NotFoundException('Production batch not found');
    if (batch.transactionType !== TransactionType.PRODUCTION_BATCH) {
      throw new BadRequestException('Transaction is not PRODUCTION_BATCH');
    }

    const lines = await this.txLineRepo.find({ where: { transactionId: batch.id } });
    if (lines.length === 0) {
      throw new BadRequestException('PRODUCTION_BATCH must include at least one output line');
    }

    const outputVariantId = lines[0].productVariantId;
    const outputQty = Number(lines[0].quantity ?? 0) || 0;
    if (!outputVariantId || outputQty <= 0) {
      throw new BadRequestException('PRODUCTION_BATCH first line must have productVariantId and quantity > 0');
    }

    const recipes = await this.recipesService.list(outputVariantId);
    const recipe = recipes.find((r) => r.isActive && r.type === RecipeType.PRODUCTION);
    if (!recipe) {
      throw new BadRequestException('No active PRODUCTION recipe for outputVariantId');
    }

    // Inputs consumption
    const inputLines: CreateTransactionLineDto[] = recipe.lines
      .sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1))
      .map((rl) => {
        const base = Number(rl.qtyPerOutputUnit ?? 0) || 0;
        const waste = Number(rl.wasteFactor ?? 0) || 0;
        const qty = base * outputQty * (1 + waste);
        return {
          productName: `Input ${rl.inputVariantId}`,
          productVariantId: rl.inputVariantId,
          quantity: qty,
          unitPrice: 0,
          subtotal: 0,
          total: 0,
          notes: 'Derived from recipe (production consumption)',
        } as any;
      });

    const inputsDto = new CreateTransactionDto();
    inputsDto.transactionType = TransactionType.ADJUSTMENT_OUT;
    inputsDto.branchId = batch.branchId as any;
    inputsDto.userId = batch.userId as any;
    inputsDto.storageId = batch.storageId as any;
    inputsDto.subtotal = 0;
    inputsDto.taxAmount = 0;
    inputsDto.discountAmount = 0;
    inputsDto.total = 0;
    inputsDto.lines = inputLines;
    inputsDto.relatedTransactionId = batch.id;
    inputsDto.metadata = {
      origin: 'PRODUCTION_CONSUMPTION',
      links: {
        productionBatchId: batch.id,
        orderId: batch.metadata?.links?.orderId ?? null,
        recipeId: recipe.id,
        recipeVersion: recipe.version,
      },
    } as any;

    const stockOut = await this.transactionsService.createTransaction(inputsDto);

    // Output stock-in
    const outLine: CreateTransactionLineDto = {
      productName: lines[0].productName || `Output ${outputVariantId}`,
      productVariantId: outputVariantId,
      quantity: outputQty,
      unitPrice: 0,
      subtotal: 0,
      total: 0,
      notes: 'Derived from recipe (production output)',
    } as any;

    const outputDto = new CreateTransactionDto();
    outputDto.transactionType = TransactionType.ADJUSTMENT_IN;
    outputDto.branchId = batch.branchId as any;
    outputDto.userId = batch.userId as any;
    outputDto.storageId = batch.storageId as any;
    outputDto.subtotal = 0;
    outputDto.taxAmount = 0;
    outputDto.discountAmount = 0;
    outputDto.total = 0;
    outputDto.lines = [outLine];
    outputDto.relatedTransactionId = batch.id;
    outputDto.metadata = {
      origin: 'PRODUCTION_OUTPUT',
      links: {
        productionBatchId: batch.id,
        orderId: batch.metadata?.links?.orderId ?? null,
        recipeId: recipe.id,
        recipeVersion: recipe.version,
      },
    } as any;

    const stockIn = await this.transactionsService.createTransaction(outputDto);

    return {
      productionBatchId: batch.id,
      stockOutInputsTransactionId: stockOut.id,
      stockInOutputTransactionId: stockIn.id,
    };
  }
}

