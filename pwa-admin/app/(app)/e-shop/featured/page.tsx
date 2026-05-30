import { Suspense } from "react";
import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { adminFillViewportBelowTopBarClassName } from "@/shared/components/layouts/layoutPageTokens";
import FeaturedPageContent from "./FeaturedPageContent";

export const dynamic = "force-dynamic";

export default function EShopFeaturedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <BasicPageLayout
      title="Productos destacados"
      subtitle="Elija productos visibles en eShop para la vitrina de la tienda."
      className={adminFillViewportBelowTopBarClassName}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-test-id="eshop-featured-page"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground" data-test-id="eshop-featured-loading">
              Cargando…
            </p>
          }
        >
          <FeaturedPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </BasicPageLayout>
  );
}
