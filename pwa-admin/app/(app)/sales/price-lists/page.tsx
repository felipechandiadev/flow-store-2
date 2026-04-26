import { Suspense } from "react";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { PriceListCollection } from "./components/PriceListCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialPriceLists = await listPriceListsForPage();

  return (
    <Suspense
      fallback={
        <div
          className="p-4 text-sm text-muted md:p-6"
          data-test-id="price-lists-page-skeleton"
        >
          Cargando…
        </div>
      }
    >
      <PriceListCollection initialPriceLists={initialPriceLists} />
    </Suspense>
  );
}
