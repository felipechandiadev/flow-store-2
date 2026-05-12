import { Suspense } from "react";
import { listCustomerSaleReturnsAction } from "@/features/sales-transactions/actions/sales-transactions-list.action";
import SalesTransactionsDataGrid from "../ui/SalesTransactionsDataGrid";

export const dynamic = "force-dynamic";

function parsePositiveInt(
  raw: string | string[] | undefined,
  fallback: number,
  max: number,
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, n);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const limit = parsePositiveInt(sp.limit, 25, 100);
  const page = parsePositiveInt(sp.page, 1, 10_000);

  const res = await listCustomerSaleReturnsAction({ page, limit });

  const rows = res.success ? res.data.rows : [];
  const total = res.success ? res.data.total : 0;

  return (
    <div className="min-h-0 p-0" data-test-id="sales-customer-returns-page-root">
      <Suspense
        fallback={
          <div
            className="text-sm text-muted-foreground"
            data-test-id="sales-customer-returns-page-skeleton"
          >
            Cargando…
          </div>
        }
      >
        <SalesTransactionsDataGrid
          rows={rows}
          total={total}
          title="Devoluciones cliente"
          testIdSuffix="returns"
        />
      </Suspense>
      {!res.success ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="sales-customer-returns-page-error"
        >
          {res.error}
        </p>
      ) : null}
    </div>
  );
}
