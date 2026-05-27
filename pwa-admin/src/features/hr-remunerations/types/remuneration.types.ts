export type RemunerationLine = {
  typeId: string;
  amount: number;
  category?: string;
};

export type RemunerationGridRow = {
  id: string;
  date: string;
  employeeId: string | null;
  employeeName: string;
  resultCenterId: string | null;
  totalEarnings: number;
  totalDeductions: number;
  netPayment: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  lines?: RemunerationLine[];
};

export type RemunerationListResult = {
  success: boolean;
  data: RemunerationGridRow[];
};

/** typeId de líneas de liquidación (haberes y descuentos). */
export const PAYROLL_LINE_TYPE_LABEL: Record<string, string> = {
  BASE_SALARY: "Sueldo base",
  ORDINARY: "Remuneración ordinaria",
  PROPORTIONAL: "Remuneración proporcional",
  OVERTIME: "Horas extraordinarias",
  BONUS: "Bono",
  ALLOWANCE: "Asignación",
  GRATIFICATION: "Gratificación",
  AFP: "AFP",
  HEALTH_INSURANCE: "Salud",
  INCOME_TAX: "Impuesto único",
  UNEMPLOYMENT_INSURANCE: "Seguro de cesantía",
  DEDUCTION_EXTRA: "Otros descuentos",
};
