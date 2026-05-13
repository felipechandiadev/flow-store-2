export type OrganizationalUnitListItem = {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  unitType: string;
  parentId?: string | null;
  branchId?: string | null;
  resultCenterId?: string | null;
  isActive?: boolean;
  branch?: { id: string; name: string } | null;
  resultCenter?: { id: string; name: string; code?: string } | null;
  parent?: { id: string; name: string; code?: string } | null;
  company?: { id: string; razonSocial?: string } | null;
};

export type OrganizationalUnitsListResult = {
  success: boolean;
  data: OrganizationalUnitListItem[];
};
