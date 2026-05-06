import { Suspense } from "react";
import { listCustomersForPage } from "@/features/sales-customers/actions/customer.action";
import CustomersDataGrid from "./ui/CustomersDataGrid";

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await listCustomersForPage({ page: 1, pageSize: 50 });

  return (
    <div className="min-h-0 p-0" data-test-id="customers-page-root">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground" data-test-id="customers-page-skeleton">
            Cargando…
          </div>
        }
      >
        <CustomersDataGrid rows={result.customers} total={result.total} />
      </Suspense>
    </div>
  );
}
