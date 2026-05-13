export type ReceptionDteType = "invoice" | "receipt" | "guide" | "other";

export type CreateDirectReceptionLineInput = {
  productId: string;
  productVariantId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity?: number;
};

export type CreateDirectReceptionInput = {
  branchId: string;
  storageId?: string | null;
  supplierId?: string | null;
  dteNumber?: string | null;
  dteType: ReceptionDteType;
  notes?: string | null;
  lines: CreateDirectReceptionLineInput[];
};

export type CreateReceptionResult = { success: true } | { success: false; error: string };

/** Fila enriquecida desde `GET /api/receptions` (`rows[]` del backend). */
export type ReceptionGridRow = {
  id: string;
  createdAt?: string;
  supplierName?: string | null;
  storageName?: string | null;
  documentNumber?: string | null;
  /** Origen: directa, desde OC, etc. */
  type?: string;
};

export type ReceptionListForGridResult = {
  rows: ReceptionGridRow[];
  total: number;
  limit: number;
  offset: number;
};
