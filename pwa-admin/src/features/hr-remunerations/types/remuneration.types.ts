export type RemunerationLine = {
  typeId: string;
  amount: number;
  category?: "EARNING" | "DEDUCTION" | string;
};

export type RemunerationGridRow = {
  id: string;
  documentNumber?: string | null;
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

export { labelPayrollLineType as labelPayrollLineTypeId } from "../lib/payroll-line-types";
