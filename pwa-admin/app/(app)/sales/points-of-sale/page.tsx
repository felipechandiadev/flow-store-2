import { Suspense } from "react";
import { ListPointsOfSaleUseCase } from "@/features/sales-points-of-sale/application/list-points-of-sale.usecase";
import { PointsOfSalePageClient } from "./PointsOfSalePageClient";

export default async function Page() {
  const list = await ListPointsOfSaleUseCase.execute();
  const initial = list.success ? list.pointsOfSale : [];

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="pos-page-skeleton">
          Cargando…
        </div>
      }
    >
      <PointsOfSalePageClient initialPointsOfSale={initial} />
    </Suspense>
  );
}

