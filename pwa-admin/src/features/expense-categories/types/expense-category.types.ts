/** Valores alineados con `ExpenseCategoryOperationalGroup` en backend. */
export type ExpenseCategoryOperationalGroupValue =
  | "PERSONAL_NOMINA"
  | "LOCALES_INSTALACIONES"
  | "SUMINISTROS_CONSUMIBLES"
  | "LOGISTICA_DISTRIBUCION"
  | "TECNOLOGIA_SISTEMAS"
  | "COMUNICACION_MARKETING_OPERATIVO"
  | "SERVICIOS_EXTERNOS"
  | "FINANCIEROS_TESORERIA"
  | "PERDIDAS_AJUSTES_OPERATIVOS"
  | "REGULATORIO_CUMPLIMIENTO";

export type OperationalGroupMetaItem = {
  value: ExpenseCategoryOperationalGroupValue;
  label: string;
  description: string;
};

export type ExpenseCategoryListItem = {
  id: string;
  companyId: string;
  /** Puede ser null si el registro es legacy; en altas nuevas el backend siempre asigna código. */
  code: string | null;
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroupValue;
  description: string | null;
  requiresApproval: boolean;
  approvalThreshold: number;
  defaultResultCenterId: string | null;
  defaultResultCenterName: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ListExpenseCategoriesResult =
  | { success: true; rows: ExpenseCategoryListItem[] }
  | { success: false; error: string; rows: [] };

export type CreateExpenseCategoryResult =
  | { success: true; category: ExpenseCategoryListItem }
  | { success: false; error: string };

export type UpdateExpenseCategoryResult =
  | { success: true; category: ExpenseCategoryListItem }
  | { success: false; error: string };

export type DeleteExpenseCategoryResult = { success: true } | { success: false; error: string };
