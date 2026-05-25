import type {
  SalesPaymentMethod,
  SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";
import type { SaleCollectionStatus } from "@/features/sales-transactions/lib/sale-collection-status";

export type RelatedSalePaymentFolio = {
  id: string;
  documentNumber: string;
};

export interface SalesTransactionListRow {
  id: string;
  documentNumber: string;
  transactionType: string;
  status: SalesPaymentStatus;
  /** `paymentStatus` de la venta o derivado de montos. */
  collectionStatus: SaleCollectionStatus;
  /** Cobros PAYMENT_IN asociados (`relatedTransactionId` → venta). */
  relatedPaymentFolios: RelatedSalePaymentFolio[];
  total: number;
  amountPaid: number;
  backorderDepositAmount: number | null;
  backorderPercent: number | null;
  paymentMethod: SalesPaymentMethod;
  /** Cantidad de líneas en metadata.payments (0 = desconocido / legacy). */
  paymentLinesCount: number;
  branchName: string | null;
  pointOfSaleName: string | null;
  counterpartyLabel: string | null;
  userFullName: string | null;
  createdAt: string;
}

export interface SalesTransactionsListResult {
  rows: SalesTransactionListRow[];
  total: number;
  page: number;
  limit: number;
}
