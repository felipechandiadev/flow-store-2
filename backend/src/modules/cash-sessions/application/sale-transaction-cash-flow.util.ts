import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';

type SaleTxLike = {
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  amountPaid?: number | string | null;
  changeAmount?: number | string | null;
  total?: number | string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Efectivo de caja asociado a una venta (SALE): entrega neta al cajón vs. vuelto.
 * Usa `metadata.paymentSnapshots` cuando existe (POS / pagos mixtos); si no, cae a `paymentMethod` CASH.
 */
export function saleTransactionCashFlows(tx: SaleTxLike): {
  cashIn: number;
  cashOut: number;
} {
  if (tx.transactionType !== TransactionType.SALE) {
    return { cashIn: 0, cashOut: 0 };
  }

  const change = Math.max(0, Number(tx.changeAmount) || 0);
  let cashIn = 0;

  const meta = tx.metadata;
  const rawSnaps =
    meta && typeof meta === 'object' && Array.isArray((meta as { paymentSnapshots?: unknown }).paymentSnapshots)
      ? ((meta as { paymentSnapshots: unknown[] }).paymentSnapshots as Array<Record<string, unknown>>)
      : null;

  if (rawSnaps && rawSnaps.length > 0) {
    for (const s of rawSnaps) {
      const m = String(s.method ?? '').toUpperCase();
      if (m === 'CASH') {
        cashIn += Math.max(0, Number(s.amount) || 0);
      }
    }
  } else if (tx.paymentMethod === PaymentMethod.CASH) {
    const paid = Number(tx.amountPaid);
    const total = Number(tx.total) || 0;
    cashIn += Math.max(0, Number.isFinite(paid) && paid > 0 ? paid : total);
  }

  return { cashIn, cashOut: change };
}
