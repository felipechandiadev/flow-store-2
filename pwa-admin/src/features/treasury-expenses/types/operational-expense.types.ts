export type OperationalExpenseStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type OperationalExpenseGridRow = {
  id: string;
  companyId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  referenceNumber: string | null;
  operationDate: string;
  status: OperationalExpenseStatus;
  description: string | null;
  branchId?: string | null;
  supplierId?: string | null;
  employeeId?: string | null;
  createdAt?: string;
};

export type ExpenseCategoryOption = {
  id: string;
  name: string;
};

export type SupplierOption = {
  id: string;
  name: string;
};

export type OperationalExpenseLinkedDteKind =
  | "SUPPLIER_INVOICE"
  | "SUPPLIER_RECEIPT"
  | "SUPPLIER_HONORARIUM_RECEIPT";

export type OperationalExpenseCreatePlannedPayment = {
  dueDate: string;
  amount: number;
  paymentMethod: "CASH" | "TRANSFER" | "CHECK";
  companyBankAccountKey?: string | null;
  supplierBankAccountKey?: string | null;
  chequeNumber?: string | null;
  chequeBankName?: string | null;
  chequeDrawerName?: string | null;
  chequeDueDate?: string | null;
};

export type OperationalExpenseCreateLinkedTributaryDocument = {
  kind: OperationalExpenseLinkedDteKind;
  dteNumber?: string;
  netAmount: number;
  totalAmount: number;
  taxAmount: number;
  taxId?: string | null;
  plannedPayments: OperationalExpenseCreatePlannedPayment[];
};

