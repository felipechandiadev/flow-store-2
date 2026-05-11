import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { listPointsOfSaleForPage } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { PointsOfSaleCollection } from "./components/PointsOfSaleCollection";
import { authOptions } from "@/lib/auth/auth-options";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;

  const [initialPointsOfSale, branches, priceListCatalog] = await Promise.all([
    listPointsOfSaleForPage(),
    listBranchesForSettingsPage(),
    listPriceListsForPage(),
  ]);

  return (
    <Suspense
      fallback={
        <div
          className="p-4 text-sm text-muted md:p-6"
          data-test-id="pos-page-skeleton"
        >
          Cargando…
        </div>
      }
    >
      <PointsOfSaleCollection
        initialPointsOfSale={initialPointsOfSale}
        branches={branches}
        priceListCatalog={priceListCatalog}
        activeCompanyId={activeCompanyId ?? null}
      />
    </Suspense>
  );
}
