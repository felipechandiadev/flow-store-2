export type SupplierInvoiceLinkInfo = {
  purchaseOrderId?: string | null;
  receptionId?: string | null;
  stockInTransactionId?: string | null;
};

export type SupplierInvoiceLine = {
  productId?: string;
  productVariantId?: string;
  productName?: string;
  productSku?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  subtotal?: number;
  lineNumber?: number;
};

export type CreateSupplierInvoiceInput = {
  branchId: string;
  userId?: string;
  supplierId: string;
  storageId?: string | null;
  externalReference?: string | null;
  notes?: string | null;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  paymentStatus?: "PENDING" | "PARTIAL" | "PAID";
  amountPaid?: number;
  relatedTransactionId?: string | null;
  links?: SupplierInvoiceLinkInfo;
  lines: SupplierInvoiceLine[];
};

export type SupplierInvoiceListItem = {
  id: string;
  documentNumber?: string | null;
  transactionType: "SUPPLIER_INVOICE";
  status: string;
  total: number;
  createdAt: string;
  externalReference?: string | null;
  supplier?: { id: string; person?: { businessName?: string; firstName?: string; lastName?: string } };
  metadata?: any;
};

export type SupplierInvoiceListResult = {
  data: SupplierInvoiceListItem[];
  total: number;
  page: number;
  limit: number;
};

