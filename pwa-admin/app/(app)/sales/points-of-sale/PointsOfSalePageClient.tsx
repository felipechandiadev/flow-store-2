"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@/shared/components/layouts";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import { PointsOfSaleCollectionAddAction } from "./components/PointsOfSaleCollectionAddAction";
import { PointOfSaleCard } from "./components/PointOfSaleCard";

type PointsOfSalePageClientProps = {
  initialPointsOfSale: PointOfSaleListItem[];
};

export function PointsOfSalePageClient({ initialPointsOfSale }: PointsOfSalePageClientProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialPointsOfSale;
    return initialPointsOfSale.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.deviceId && p.deviceId.toLowerCase().includes(q)) ||
        (p.branch?.name && p.branch.name.toLowerCase().includes(q))
    );
  }, [initialPointsOfSale, q]);

  return (
    <CollectionPageLayout
      title="Puntos de venta"
      addAction={<PointsOfSaleCollectionAddAction />}
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar"
      contentItems={
        filtered.length > 0
          ? filtered.map((p) => (
              <PointOfSaleCard key={p.id} point={p} data-test-id={`pos-card-${p.id}`} />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
    />
  );
}
