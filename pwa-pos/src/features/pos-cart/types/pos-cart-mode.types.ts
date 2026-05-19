/** Modalidad del carrito en el POS. */
export type PosCartMode = "sale" | "return" | "fulfill_backorder";

/** Venta origen cuando el carrito está en modo devolución. */
export type LoadedReturnSaleMeta = {
  id: string;
  documentNumber: string;
  total: number;
  createdAt: string;
};

/** Encargo/reserva abierta cargada para liquidar (venta + abono). */
export type LoadedBackorderMeta = {
  id: string;
  documentNumber: string;
  orderTotal: number;
  depositAvailable: number;
  createdAt: string;
  /** Cantidad máxima por variante según la reserva. */
  lineMaxQtyByVariantId: Record<string, number>;
};
