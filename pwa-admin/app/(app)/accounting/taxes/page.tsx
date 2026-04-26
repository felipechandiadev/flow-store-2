import { Suspense } from "react";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { TaxesCollection } from "./components/TaxesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialTaxes = await listTaxesForPage();

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="taxes-page-skeleton">
          Cargando…
        </div>
      }
    >
      <TaxesCollection initialTaxes={initialTaxes} />
    </Suspense>
  );
}
