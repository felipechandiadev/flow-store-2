import type { CustomerCreditNoteUsageStatus } from "@/features/sales-customers/types/customer-related-documents.types";

export function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatCustomerDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const TX_TYPE_LABEL: Record<string, string> = {
  SALE: "Venta",
  BACKORDER: "Encargo",
  PURCHASE: "Compra",
  PAYMENT_IN: "Cobro",
  SALE_RETURN: "Devolución",
  CUSTOMER_CREDIT_NOTE: "Nota de crédito",
};

export const CREDIT_NOTE_USAGE_LABEL: Record<CustomerCreditNoteUsageStatus, string> = {
  available: "Disponible",
  partially_used: "Utilizada parcialmente",
  fully_used: "Utilizada",
};

export function creditNoteUsageVariant(
  status: CustomerCreditNoteUsageStatus,
): "success-outlined" | "warning-outlined" | "secondary-outlined" {
  if (status === "available") return "success-outlined";
  if (status === "partially_used") return "warning-outlined";
  return "secondary-outlined";
}
