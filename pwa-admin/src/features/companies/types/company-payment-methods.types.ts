/**
 * Tipos compartidos con el backend para configurar medios de pago a nivel
 * empresa (`companies.settings.paymentMethods`).
 */
/**
 * Tipos de medio de pago configurables a nivel empresa. NO incluye `MIXED`:
 * un pago "mixto" se deduce del sistema cuando una transacción tiene más
 * de un detalle de pago, no es una opción del catálogo.
 */
export type CompanyPaymentMethodId =
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "TRANSFER"
  | "CHECK"
  | "CREDIT"
  | "INTERNAL_CREDIT";

export interface CompanyPaymentMethodConfig {
  id: string;
  method: CompanyPaymentMethodId;
  alias?: string | null;
  displayOrder: number;
  isActive: boolean;
  requireReference: boolean;
  bankAccountKey?: string | null;
  metadata?: Record<string, any> | null;
}

export const COMPANY_PAYMENT_METHOD_LABELS: Record<
  CompanyPaymentMethodId,
  string
> = {
  CASH: "Efectivo",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CREDIT: "Crédito",
  INTERNAL_CREDIT: "Crédito interno",
};

/** Métodos válidos para POS (caja física). CREDIT/INTERNAL_CREDIT son
 * estados de documento (cuentas por cobrar), no medios tangibles para
 * el cajero, por eso se excluyen. */
export const POS_VALID_METHOD_IDS: CompanyPaymentMethodId[] = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
  "CHECK",
];
