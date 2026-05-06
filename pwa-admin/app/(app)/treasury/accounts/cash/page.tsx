import { CompanyRequest } from "@/features/settings-branches/infrastructure/company.request";
import { BranchRequest } from "@/features/settings-branches/infrastructure/branch.request";
import { PointOfSaleRequest } from "@/features/sales-points-of-sale/infrastructure/point-of-sale.request";
import { CashHubsRequest } from "@/features/treasury-cash-hubs/infrastructure/cash-hubs.request";
import { TreasuryCashHubMovementsRequest } from "@/features/treasury-cash-hubs/infrastructure/treasury-cash-hub-movements.request";
import { redirect } from "next/navigation";
import { resolveTreasuryCashHubSelection } from "./treasury-cash-hubs";
import { mapApiTxToMovementGridRow, type TreasuryMovementGridRow } from "../bank/treasury-movements-mapper";
import TreasuryCashTabContent from "./TreasuryCashTabContent";

export const dynamic = "force-dynamic";

export default async function TreasuryCashPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const company = await CompanyRequest.getDetails();
  const companyId = company?.id?.trim() ?? "";

  const [brRes, posRes, hubs] = await Promise.all([
    companyId ? BranchRequest.findAll(false) : Promise.resolve({ success: true as const, branches: [] }),
    companyId ? PointOfSaleRequest.findAll(true) : Promise.resolve({ success: true as const, pointsOfSale: [] }),
    companyId ? CashHubsRequest.list(companyId) : Promise.resolve([]),
  ]);

  const branches = brRes.success ? brRes.branches : [];
  const pointsOfSale = posRes.success ? posRes.pointsOfSale : [];

  if (!companyId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No hay empresa configurada. Defina la empresa para administrar centros de acopio.
      </div>
    );
  }

  const sp = await searchParams;
  const raw = sp.cashHub;
  const cashHubParam = Array.isArray(raw) ? raw[0] : raw;
  const { selectedId, mustRedirect } = resolveTreasuryCashHubSelection(hubs, cashHubParam);

  if (mustRedirect && selectedId) {
    redirect(`/treasury/accounts/cash?cashHub=${encodeURIComponent(selectedId)}`);
  }

  let movementRows: TreasuryMovementGridRow[] = [];
  let movementsTotal = 0;
  if (selectedId) {
    try {
      const r = await TreasuryCashHubMovementsRequest.listByCashHubId({
        cashHubId: selectedId,
        page: 1,
        limit: 200,
      });
      movementRows = r.rows.map(mapApiTxToMovementGridRow);
      movementsTotal = r.total;
    } catch {
      movementRows = [];
      movementsTotal = 0;
    }
  }

  return (
    <TreasuryCashTabContent
      company={company}
      hubs={hubs}
      selectedCashHubId={selectedId}
      movementRows={movementRows}
      movementsTotal={movementsTotal}
      branches={branches}
      pointsOfSale={pointsOfSale}
    />
  );
}
