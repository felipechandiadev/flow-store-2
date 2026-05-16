import { Suspense } from "react";
import { listBrandsForPage } from "@/features/catalog-brands/actions/brand.action";
import { BrandsCollection } from "./components/BrandsCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialBrands = await listBrandsForPage();

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="brands-page-skeleton">
          Cargando…
        </div>
      }
    >
      <BrandsCollection initialBrands={initialBrands} />
    </Suspense>
  );
}
