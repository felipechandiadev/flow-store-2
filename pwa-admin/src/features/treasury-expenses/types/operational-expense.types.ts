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

