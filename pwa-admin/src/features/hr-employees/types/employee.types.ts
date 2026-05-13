export type EmployeeGridRow = {
  id: string;
  companyId?: string;
  personId?: string;
  branchId?: string | null;
  resultCenterId?: string | null;
  organizationalUnitId?: string | null;
  employmentType?: string;
  status?: string;
  hireDate?: string;
  terminationDate?: string | null;
  baseSalary?: string | null;
};

export type EmployeeListResult = {
  success: boolean;
  data: EmployeeGridRow[];
};
