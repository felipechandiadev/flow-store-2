import { Suspense } from "react";
import { listPurchaseReturnsForPage } from "@/features/purchasing-purchase-returns/actions/purchase-return.action";
import type { PurchaseReturnListItem } from "@/features/purchasing-purchase-returns/types/purchase-return.types";
import PurchaseReturnsDataGrid, {
  type PurchaseReturnGridRow,
} from "./ui/PurchaseReturnsDataGrid";

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

function toGridRows(data: PurchaseReturnListItem[]): PurchaseReturnGridRow[] {
  return data.map((x) => {
    const person = x.supplier?.person;
    const supplierName =
      person?.businessName ||
      [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
      x.supplier?.id ||
      "—";
    return { ...x, supplierName };
  });
}

export default async function PurchaseReturnsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25));
  const search = parseSp(sp, "search");

  const res = await listPurchaseReturnsForPage({
    page,
    limit,
    search: search || undefined,
  });

  const rows = toGridRows(res.data);

  return (
    <div className="min-h-0 p-0" data-test-id="purchase-returns-list-page-root">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground" data-test-id="purchase-returns-list-skeleton">
            Cargando…
          </div>
        }
      >
        <PurchaseReturnsDataGrid rows={rows} total={res.total} />
      </Suspense>
    </div>
  );
}
