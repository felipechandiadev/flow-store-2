import type {
  AccountsPayablePayeeType,
  AccountsPayablePaymentType,
  AccountsPayableSourceType,
  AccountsPayableStatus,
} from "../types/accounts-payable.types";

export const ACCOUNTS_PAYABLE_SOURCE_TYPE_LABELS: Record<
  AccountsPayableSourceType | string,
  string
> = {
  PURCHASE: "Compra",
  PAYROLL: "Remuneración",
  OPERATING_EXPENSE: "Gasto operativo",
  OTHER: "Otro",
};

export const ACCOUNTS_PAYABLE_PAYMENT_TYPE_LABELS: Record<
  AccountsPayablePaymentType | string,
  string
> = {
  SUPPLIER_PAYMENT: "Compra",
  PAYROLL_PAYMENT: "Nómina",
  EXPENSE_PAYMENT: "Gasto operativo",
};

export const ACCOUNTS_PAYABLE_STATUS_LABELS: Record<
  AccountsPayableStatus | string,
  string
> = {
  PENDING: "Pendiente",
  PARTIAL: "Parcial",
  OVERDUE: "Vencida",
  PAID: "Pagada",
};

export const ACCOUNTS_PAYABLE_PAYEE_TYPE_LABELS: Record<
  AccountsPayablePayeeType | string,
  string
> = {
  SUPPLIER: "Proveedor",
  EMPLOYEE: "Empleado",
  OTHER: "Otro",
};

export function labelAccountsPayableSourceType(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_SOURCE_TYPE_LABELS[value] ?? value;
}

export function labelAccountsPayablePaymentType(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_PAYMENT_TYPE_LABELS[value] ?? value;
}

export function labelAccountsPayableStatus(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_STATUS_LABELS[value] ?? value;
}

export function labelAccountsPayablePayeeType(value: string | null | undefined): string {
  if (!value) return "—";
  return ACCOUNTS_PAYABLE_PAYEE_TYPE_LABELS[value] ?? value;
}
