/** Payload al crear cliente desde el POS (alineado con POST /api/customers). */
export type PosCreateCustomerInput = {
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

export type PosCreateCustomerResult =
  | { success: true; customerId: string }
  | { success: false; message: string };
