import type {
  SalesPaymentMethod,
  SalesPaymentStatus,
} from "@/features/sales-payments/types/sales-payment.types";

export interface SalesTransactionListRow {
  id: string;
  documentNumber: string;
  transactionType: string;
  status: SalesPaymentStatus;
  total: number;
  paymentMethod: SalesPaymentMethod;
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
