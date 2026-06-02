export type PosCustomerDocumentType = "RUN" | "RUT" | "PASSPORT" | "DNI";

/** Formulario al crear cliente desde el POS (se normaliza en la action antes del POST). */
export type PosCreateCustomerInput = {
  personType: "NATURAL" | "COMPANY";
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType: PosCustomerDocumentType;
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
  notes?: string | null;
};

/** Cuerpo enviado a POST /api/customers. */
export type PosCreateCustomerApiBody = {
  personType: "NATURAL" | "COMPANY";
  firstName: string;
  lastName?: string;
  businessName?: string;
  documentType: PosCustomerDocumentType;
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
