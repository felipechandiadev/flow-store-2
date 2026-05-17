/** Modalidad del carrito en el POS. */
export type PosCartMode = "sale" | "return";

/** Venta origen cuando el carrito está en modo devolución. */
export type LoadedReturnSaleMeta = {
  id: string;
  documentNumber: string;
  total: number;
  createdAt: string;
};
