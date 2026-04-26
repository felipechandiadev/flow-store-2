import { Suspense } from "react";
import { listAttributesForPage } from "@/features/inventory-attributes/actions/attribute.action";
import { AttributesCollection } from "./components/AttributesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialAttributes = await listAttributesForPage();

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="attributes-page-skeleton">
          Cargando…
        </div>
      }
    >
      <AttributesCollection initialAttributes={initialAttributes} />
    </Suspense>
  );
}
