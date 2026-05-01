import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Transaction, TransactionType } from '@modules/transactions/domain/transaction.entity';
import { AutomationEventType } from '../../../domain/automation-event-type.enum';

@Injectable()
export class UpdateStockActionHandler {
  private readonly logger = new Logger(UpdateStockActionHandler.name);

  constructor(private readonly dataSource: DataSource) {}

  async execute(ctx: { companyId: string; eventType: AutomationEventType; payload: any }, rule: any) {
    const tx = ctx.payload?.transaction as Transaction;
    if (!tx?.id) return;

    const type = tx.transactionType;
    const incomingTypes = [
      TransactionType.PURCHASE,
      TransactionType.TRANSFER_IN,
      TransactionType.ADJUSTMENT_IN,
    ];
    const outgoingTypes = [
      TransactionType.SALE,
      TransactionType.TRANSFER_OUT,
      TransactionType.ADJUSTMENT_OUT,
    ];
    if (![...incomingTypes, ...outgoingTypes].includes(type)) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(Transaction);
      const txFull = await txRepo.findOne({
        where: { id: tx.id },
        relations: ['lines'] as any,
      });
      const lines = (txFull && (txFull as any).lines) || (tx as any).lines || [];

      const stockRepo = manager.getRepository(StockLevel);
      const storageId = tx.storageId ?? tx.targetStorageId ?? null;
      if (!storageId) {
        this.logger.warn(
          `Transaction ${tx.id} has no storageId; skipping inventory update. ruleId=${rule?.id}`,
        );
        return;
      }

      for (const line of lines) {
        const variantId = line.productVariantId;
        let qty = Number(line.quantity ?? line.receivedQuantity ?? 0) || 0;
        if (!variantId || qty === 0) continue;

        if (outgoingTypes.includes(type)) {
          qty = -qty;
        }

        let stockEntry = (await stockRepo.findOne({
          where: { productVariantId: variantId, storageId } as any,
        })) as any;
        const previousStock = stockEntry ? Number(stockEntry.physicalStock ?? 0) : 0;

        if (!stockEntry) {
          stockEntry = stockRepo.create({
            productVariantId: variantId,
            storageId,
            physicalStock: qty,
            committedStock: 0,
            availableStock: qty,
            incomingStock: 0,
            lastTransactionId: tx.id,
          } as any);
        } else {
          stockEntry.physicalStock = Number(
            (Number(stockEntry.physicalStock ?? 0) + qty).toFixed(6),
          );
          stockEntry.availableStock = Number(
            (Number(stockEntry.availableStock ?? 0) + qty).toFixed(6),
          );
          stockEntry.lastTransactionId = tx.id;
        }

        await stockRepo.save(stockEntry as StockLevel);

        // PMP update (same behavior as existing listener)
        const unitCost = Number(line.unitCost ?? 0) || 0;
        if (unitCost > 0 && qty > 0) {
          const variantRepo = manager.getRepository(ProductVariant);
          const variant = await variantRepo.findOne({ where: { id: variantId } });
          if (variant) {
            const prevPmp = Number((variant as any).pmp ?? 0);
            const newPmp =
              previousStock <= 0
                ? unitCost
                : (previousStock * prevPmp + qty * unitCost) /
                  (previousStock + qty);
            (variant as any).pmp = Number(newPmp.toFixed(2));
            await variantRepo.save(variant);
          }
        }
      }
    });
  }
}

