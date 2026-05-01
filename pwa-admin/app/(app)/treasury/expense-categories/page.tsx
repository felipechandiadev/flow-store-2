import { Suspense } from "react";
import {
  listExpenseCategoriesForPage,
  listExpenseCategoryOperationalGroupsMeta,
} from "@/features/expense-categories/actions/expense-category.action";
import { ExpenseCategoriesCollection } from "./components/ExpenseCategoriesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [initialCategories, groupOptions] = await Promise.all([
    listExpenseCategoriesForPage(),
    listExpenseCategoryOperationalGroupsMeta(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="expense-categories-page-skeleton">
          Cargando…
        </div>
      }
    >
      <ExpenseCategoriesCollection initialCategories={initialCategories} groupOptions={groupOptions} />
    </Suspense>
  );
}
