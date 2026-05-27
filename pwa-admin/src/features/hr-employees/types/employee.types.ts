export type EmployeePersonSummary = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type EmployeeBranchSummary = {
  id: string;
  name?: string | null;
};

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
  person?: EmployeePersonSummary | null;
  branch?: EmployeeBranchSummary | null;
};

export type EmployeeListResult = {
  success: boolean;
  data: EmployeeGridRow[];
};
