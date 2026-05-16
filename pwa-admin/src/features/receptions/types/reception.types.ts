import type { ReceptionSupplierDocumentPaymentPayload } from "./reception-document-payment.types";

export type ReceptionDteType = "invoice" | "receipt" | "guide" | "other";

/** Totales del documento fiscal (factura/boleta) alineados con el builder (neto + IVA). */
export type SupplierFiscalAmountsPayload = {
  subtotalNeto: number;
  taxAmount: number;
  total: number;
  taxId: string | null;
  taxRatePct: number;
};

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
  /** Referencia o folio del documento del proveedor (factura, guía, etc.). */
  reference?: string | null;
  documentType: ReceptionDteType;
  notes?: string | null;
  lines: CreateDirectReceptionLineInput[];
  /** Plan de pago del documento fiscal (factura/boleta); el backend crea la transacción fiscal al guardar. */
  supplierDocumentPayment?: ReceptionSupplierDocumentPaymentPayload | null;
  /** Montos y tasa para `SUPPLIER_INVOICE` / `SUPPLIER_RECEIPT` (obligatorio si documentType es factura o boleta). */
  supplierFiscalAmounts?: SupplierFiscalAmountsPayload | null;
};

export type CreateReceptionResult =
  | {
      success: true;
      receptionId?: string;
      internalDocumentNumber?: string | null;
      supplierDocumentError?: string | null;
    }
  | { success: false; error: string };

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

/** Recepción con líneas (p. ej. `GET /api/receptions/:id` o `.../resolve`). */
export type ReceptionLineForReturn = {
  id: string;
  productId?: string | null;
  productVariantId?: string | null;
  productName: string;
  sku?: string | null;
  variantName?: string | null;
  quantity: number;
  receivedQuantity?: number | null;
  unitPrice: number;
};

export type ReceptionDetailForReturn = {
  id: string;
  supplierId?: string | null;
  storageId?: string | null;
  createdAt?: string;
  lines: ReceptionLineForReturn[];
};

export type ReceptionFetchResult =
  | { success: true; reception: ReceptionDetailForReturn }
  | { success: false; error: string };
