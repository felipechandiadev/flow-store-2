import { Suspense } from "react";
import { listQuotationsAction } from "@/features/quotations/actions/quotations.action";
import QuotationsDataGrid from "./ui/QuotationsDataGrid";

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await listQuotationsAction();

  const rows = res.success ? res.items : [];
  const total = res.success ? res.total : 0;

  return (
    <div className="min-h-0 p-0" data-test-id="quotations-page-root">
      <Suspense
        fallback={
          <div
            className="text-sm text-muted-foreground"
            data-test-id="quotations-page-skeleton"
          >
            Cargando…
          </div>
        }
      >
        <QuotationsDataGrid rows={rows} total={total} />
      </Suspense>
      {!res.success ? (
        <p className="p-4 text-sm text-error" data-test-id="quotations-page-error">
          {res.error}
        </p>
      ) : null}
    </div>
  );
}
