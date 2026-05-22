/**
 * Plan de pago del documento fiscal (factura/boleta) asociado a una recepción directa.
 * Se envía en `supplierDocumentPayment` al crear la recepción.
 */
export type ReceptionDocumentPaymentMode = "PENDING" | "PENDING_SCHEDULED" | "PARTIAL" | "COMPLETED";

export type ReceptionPlannedPaymentLinePayload = {
  dueDate: string;
  amount: number;
  paymentMethod: "CASH" | "TRANSFER" | "CHECK";
  companyBankAccountKey?: string | null;
  supplierBankAccountKey?: string | null;
  chequeNumber?: string | null;
  /** Admin: centro de acopio si `paymentMethod === "CASH"`. */
  cashHubId?: string | null;
  /** POS: sesión de caja si el pago en efectivo sale del cajón. */
  cashSessionId?: string | null;
};

export type ReceptionSupplierDocumentPaymentPayload = {
  mode: ReceptionDocumentPaymentMode;
  /** Solo modo PARTIAL: monto ya pagado (debe coincidir con la suma de `paidLines`). */
  partialPaidAmount?: number;
  /** Abonos ya ejecutados al momento de la recepción (PARTIAL o COMPLETED en un pago). */
  paidLines: ReceptionPlannedPaymentLinePayload[];
  /** Cuotas / saldo a pagar a futuro (PENDING_SCHEDULED, PARTIAL con saldo, o vacío). */
  scheduledLines: ReceptionPlannedPaymentLinePayload[];
};

export function formatReceptionPaymentSummary(payload: ReceptionSupplierDocumentPaymentPayload | null): string {
  if (!payload) {
    return "";
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(Number(n) || 0),
    );
  const lineStr = (prefix: string, lines: ReceptionPlannedPaymentLinePayload[]) => {
    if (!lines.length) {
      return "";
    }
    const parts = lines.map((l, i) => {
      const m =
        l.paymentMethod === "CASH"
          ? "Efectivo"
          : l.paymentMethod === "TRANSFER"
            ? "Transferencia"
            : "Cheque";
      return `${i + 1}) ${fmt(l.amount)} · ${m} · vence ${l.dueDate}`;
    });
    return `${prefix}: ${parts.join(" | ")}`;
  };
  switch (payload.mode) {
    case "PENDING":
      return "Pago documento: pendiente (sin plan detallado).";
    case "PENDING_SCHEDULED":
      return `Pago documento: pendiente con cuotas. ${lineStr("Cuotas", payload.scheduledLines)}`.trim();
    case "PARTIAL":
      return `Pago documento: parcial (${fmt(payload.partialPaidAmount ?? 0)} abonado). ${lineStr("Abonado", payload.paidLines)} ${lineStr("Pendiente", payload.scheduledLines)}`.trim();
    case "COMPLETED":
      return `Pago documento: pagado. ${lineStr("Pago", payload.paidLines)}`.trim();
    default:
      return "";
  }
}
