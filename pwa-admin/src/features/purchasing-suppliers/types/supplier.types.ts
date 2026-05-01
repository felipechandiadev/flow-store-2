/** Coincide con backend `PersonType`. */
export type SupplierPersonType = "NATURAL" | "COMPANY";

/** Coincide con backend `DocumentType`. */
export type SupplierDocumentType = "RUN" | "RUT" | "PASSPORT" | "OTHER";

/** Coincide con backend `SupplierType`. */
export type SupplierCommercialType =
  | "MANUFACTURER"
  | "DISTRIBUTOR"
  | "WHOLESALER"
  | "SERVICE_PROVIDER"
  | "CONTRACTOR"
  | "LOGISTICS"
  | "IMPORTER";

export type SupplierPersonGrid = {
  id: string;
  type: SupplierPersonType;
  firstName: string;
  lastName?: string | null;
  businessName?: string | null;
  documentType?: SupplierDocumentType | string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type SupplierGridRow = {
  id: string;
  alias?: string | null;
  supplierType: SupplierCommercialType | string;
  defaultPaymentTermDays: number;
  isActive: boolean;
  notes?: string | null;
  person?: SupplierPersonGrid | null;
};
