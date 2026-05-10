export const POS_PAYMENT_METHOD_IDS = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
  "CHECK",
] as const;

export type PosPaymentMethodId = (typeof POS_PAYMENT_METHOD_IDS)[number];

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
  /** Datos del cheque cuando `type === "CHECK"`. */
  checkData?: PosCheckPaymentData;
};
