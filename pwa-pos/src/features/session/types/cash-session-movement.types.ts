/** Fila devuelta por `GET /api/cash-sessions/:id/movements` (alineada con `SessionMovement` en backend). */

export type CashSessionMovementDirection = "IN" | "OUT" | "NEUTRAL";

export type CashSessionMovementRow = {
  id: string;
  transactionType: string;
  documentNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  paymentMethodLabel?: string;
  userId: string | null;
  userFullName: string | null;
  userUserName: string | null;
  notes: string | null;
  reason: string | null;
  metadata: unknown;
  direction: CashSessionMovementDirection;
};
