"use server";

import { OrganizationalUnitRequest } from "../infrastructure/organizational-unit.request";
import type { OrganizationalUnitListItem } from "../types/organizational-unit.types";

export async function listOrganizationalUnitsAction(opts: {
  includeInactive?: boolean;
  unitType?: string;
  branchId?: string;
  companyId?: string;
  resultCenterId?: string;
} = {}): Promise<OrganizationalUnitListItem[]> {
  return OrganizationalUnitRequest.list(opts);
}
