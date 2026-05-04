export type SupplierCreditNoteListItem = {
  id: string;
  documentNumber?: string | null;
  createdAt: string;
  status?: string;
  total?: number | string | null;
  supplier?: {
    id: string;
    person?: { businessName?: string; firstName?: string; lastName?: string };
  };
  externalReference?: string | null;
};

export type SupplierCreditNoteListResult = {
  data: SupplierCreditNoteListItem[];
  total: number;
  page: number;
  limit: number;
};

export type CreateSupplierCreditNoteInput = {
  branchId: string;
  /** Lo rellena la server action desde la sesión si se omite. */
  userId?: string;
  supplierId: string;
  purchaseReturnId: string;
  supplierInvoiceId?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  externalReference?: string | null;
  notes?: string | null;
  lines: Array<{
    quantity: number;
    unitPrice: number;
    productName: string;
    subtotal?: number;
    total?: number;
    taxAmount?: number;
    taxRate?: number;
  }>;
};
