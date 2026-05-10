export type PosCustomerSearchRow = {
  customerId: string;
  displayName: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
};

export type PosCustomerSearchResponse =
  | {
      success: true;
      page: number;
      pageSize: number;
      total: number;
      customers: PosCustomerSearchRow[];
    }
  | { success: false; message: string };

/** Cliente de la venta en curso: puede ser de catálogo o invitado (sin id). */
export type PosSaleCustomer = {
  customerId: string | null;
  name: string;
  document: string;
  phone: string;
};
