export const POS_PAYMENT_METHOD_IDS = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
  "CHECK",
  "CUSTOMER_CREDIT_NOTE",
  "ORDER_ADVANCE",
] as const;

export type PosPaymentMethodId = (typeof POS_PAYMENT_METHOD_IDS)[number];

export const CUSTOMER_LINKED_PAYMENT_METHODS = [
  "CUSTOMER_CREDIT_NOTE",
  "ORDER_ADVANCE",
] as const;

export type CustomerLinkedPaymentMethod = (typeof CUSTOMER_LINKED_PAYMENT_METHODS)[number];

export function isCustomerLinkedPaymentMethod(
  method: string,
): method is CustomerLinkedPaymentMethod {
  return (CUSTOMER_LINKED_PAYMENT_METHODS as readonly string[]).includes(method);
}

/**
 * Datos específicos de un cheque entrante (cliente -> empresa). Se
 * adjuntan al `PosPaymentLine` cuando `type === "CHECK"`. El backend
 * los recibe en `payments[].checkData` y los persiste en
 * `metadata.paymentSnapshots[].checkData` para materializar un registro
 * `Check` independiente con su propio ciclo de vida.
 */
export type PosCheckPaymentData = {
  checkNumber: string;
  bankName: string;
  drawerName?: string;
  drawerDocument?: string;
  /** Fecha de emisión (ISO YYYY-MM-DD). Vacío = hoy en el backend. */
  issueDate?: string;
  /** "A fecha" para cheques postdatados. */
  dueDate?: string;
};

/**
 * Línea de pago en POS.
 *
 * `type` se mantiene como enum semántico (compatibilidad con backend +
 * asientos contables). `companyPaymentMethodId` referencia la entrada
 * concreta del catálogo de la empresa para hidratar alias / banco /
 * snapshot al confirmar la venta.
 */
export type PosPaymentLine = {
  id: string;
  type: PosPaymentMethodId;
  amount: number;
  reference: string;
  /** Id estable del medio configurado a nivel empresa. Opcional por compat;
   * cuando viene definido, el backend persistirá un snapshot trazable. */
  companyPaymentMethodId?: string | null;
  /** Solo TRANSFER: cuenta bancaria destino (de la empresa). */
  bankAccountKey?: string | null;
  /** Datos del cheque cuando `type === "CHECK"`. */
  checkData?: PosCheckPaymentData;
  /** Nota de crédito aplicada (`CUSTOMER_CREDIT_NOTE`). */
  creditNoteTransactionId?: string | null;
  /** Encargo cuyo abono se aplica (`ORDER_ADVANCE`). */
  backorderTransactionId?: string | null;
};
