export type PosCustomerDetail = {
  customerId: string;
  displayName: string;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  paymentDayOfMonth: number | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PosCustomerPaymentRow = {
  id: string;
  documentNumber: string | null;
  type: string | null;
  status: string | null;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
};

export type PosCustomerQuotaRow = {
  id: string;
  transactionId: string | null;
  documentNumber: string | null;
  amount: number;
  dueDate: string | null;
  createdAt: string | null;
};

export type PosCustomerDetailBundle =
  | {
      success: true;
      customer: PosCustomerDetail;
      payments: PosCustomerPaymentRow[];
      quotas: PosCustomerQuotaRow[];
    }
  | { success: false; message: string };
