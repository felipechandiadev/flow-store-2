/** Fila devuelta por GET `/customers` (adapter + `CustomersService.search`). */
export type CustomerListRow = {
  /** Alias para DataGrid (`row.id`). */
  id: string;
  customerId: string;
  personId: string;
  displayName: string;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  creditLimit: number;
  currentBalance?: number;
  availableCredit?: number;
  paymentDayOfMonth?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerListResult = {
  success?: boolean;
  page: number;
  pageSize: number;
  total: number;
  customers: CustomerListRow[];
  /** Política empresa: crédito interno para clientes (Ajustes → Empresa). */
  internalCreditEnabled?: boolean;
};

export type CreateCustomerFormInput = {
  personType: "NATURAL";
  firstName: string;
  lastName?: string;
  documentType: "RUN" | "PASSPORT" | "OTHER";
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
  notes?: string | null;
};
