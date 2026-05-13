"use server";

import { EmployeeRequest } from "../infrastructure/employee.request";
import type { EmployeeGridRow } from "../types/employee.types";

export async function listEmployeesForGridAction(opts: {
  includeTerminated?: boolean;
  status?: string;
  branchId?: string;
  companyId?: string;
} = {}): Promise<EmployeeGridRow[]> {
  return EmployeeRequest.list(opts);
}
