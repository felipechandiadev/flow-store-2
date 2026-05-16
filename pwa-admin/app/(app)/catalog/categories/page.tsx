import { Suspense } from "react";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { CategoriesCollection } from "./components/CategoriesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialCategories = await listCategoriesForPage();

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="categories-page-skeleton">
          Cargando…
        </div>
      }
    >
      <CategoriesCollection initialCategories={initialCategories} />
    </Suspense>
  );
}
