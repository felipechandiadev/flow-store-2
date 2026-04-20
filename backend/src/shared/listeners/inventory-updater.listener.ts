import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import { TransactionType } from '@modules/transactions/domain/transaction.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

/**
 * LISTENER: Actualiza saldos de inventario cuando se crea una transacción de tipo PURCHASE / TRANSFER_IN / ADJUSTMENT_IN
 */
@Injectable()
export class InventoryUpdaterListener {
  private logger = new Logger(InventoryUpdaterListener.name);

  constructor(private readonly dataSource: DataSource) {}

  @OnEvent('transaction.created', { async: true })
  async handleTransactionCreated(payload: TransactionCreatedEvent) {
    try {
      const tx = payload.transaction;
      const type = tx.transactionType;

      // Determine if this transaction affects inventory. We handle both
      // incoming movements (add stock) and outgoing movements (subtract
      // stock). Everything else is ignored.
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
        return; // nothing to do for other transaction types
      }

      await this.dataSource.transaction(async (manager) => {
        // Reload transaction with lines to ensure we have detail
        const txRepo = manager.getRepository(Transaction);
        const txFull = await txRepo.findOne({
          where: { id: tx.id },
          relations: ['lines'] as any,
        });
        const lines =
          (txFull && (txFull as any).lines) || (tx as any).lines || [];

        const stockRepo = manager.getRepository(StockLevel);

        // storage is either the source or the target depending on transaction
        const storageId = tx.storageId ?? tx.targetStorageId ?? null;
        if (!storageId) {
          this.logger.warn(
            `Transaction ${tx.id} has no storageId; skipping inventory update.`,
          );
          return;
        }

        for (const line of lines) {
          const variantId = line.productVariantId;
          let qty = Number(line.quantity ?? line.receivedQuantity ?? 0) || 0;
          if (!variantId || qty === 0) continue;

          // outgoing movements should reduce stock
          if (outgoingTypes.includes(type)) {
            qty = -qty;
          }

          // capture previous stock before update (needed for PMP calculation)
          let stockEntry = (await stockRepo.findOne({
            where: { productVariantId: variantId, storageId } as any,
          })) as any;
          const previousStock = stockEntry
            ? Number(stockEntry.physicalStock ?? 0)
            : 0;

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
          const sign = qty >= 0 ? '+' : '';
          this.logger.log(
            `Updated stock for variant ${variantId} in storage ${storageId}: ${sign}${qty}`,
          );

          // -- PMP calculation -------------------------------------------------
          // Only update if a unitCost is provided on the line and qty > 0
          const unitCost = Number(line.unitCost ?? 0) || 0;
          if (unitCost > 0 && qty > 0) {
            const variantRepo = manager.getRepository(ProductVariant);
            const variant = await variantRepo.findOne({
              where: { id: variantId },
            });
            if (variant) {
              const prevPmp = Number(variant.pmp ?? 0);
              const newPmp =
                previousStock <= 0
                  ? unitCost
                  : (previousStock * prevPmp + qty * unitCost) /
                    (previousStock + qty);
              variant.pmp = Number(newPmp.toFixed(2));
              await variantRepo.save(variant);
              this.logger.log(
                `Recalculated PMP for variant ${variantId}: ${variant.pmp}`,
              );
            }
          }
        }
      });
    } catch (err) {
      this.logger.error(
        'Error updating inventory after transaction.created: ' +
          (err as Error).message,
      );
      // swallow error to avoid breaking other listeners
    }
  }
}
