import { Suspense } from "react";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import { UnitsCollection } from "./components/UnitsCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialUnits = await listUnitsForPage();

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="units-page-skeleton">
          Cargando…
        </div>
      }
    >
      <UnitsCollection initialUnits={initialUnits} />
    </Suspense>
  );
}
