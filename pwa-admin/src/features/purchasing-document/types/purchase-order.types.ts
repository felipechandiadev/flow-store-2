export type CreatePurchaseOrderLineInput = {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxIds: string[];
};

export type CreatePurchaseOrderInput = {
  branchId: string;
  /** Obligatorio si `saveAsDraft` no es verdadero. */
  supplierId?: string;
  /** Si se omite, la transacción queda sin almacén hasta recepción/conversión a compra. */
  storageId?: string;
  documentDate: string;
  documentFolio?: string;
  lines: CreatePurchaseOrderLineInput[];
  /** Si es true, estado DRAFT y se permiten borrador sin proveedor ni líneas. */
  saveAsDraft?: boolean;
};

export type CreatePurchaseOrderResult =
  | { success: true; id: string; documentNumber?: string }
  | { success: false; error: string };
