import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";
import PurchaseOrderNewPageContent from "./PurchaseOrderNewPageContent";

export const dynamic = "force-dynamic";

function PurchaseOrderNewFallback() {
  return (
    <div className="min-h-0 min-w-0 p-3 text-sm text-muted-foreground" data-test-id="purchase-orders-new-skeleton">
      Cargando búsqueda…
    </div>
  );
}

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  noStore();

  return (
    <Suspense fallback={<PurchaseOrderNewFallback />}>
      <PurchaseOrderNewPageContent searchParams={searchParams} />
    </Suspense>
  );
}
