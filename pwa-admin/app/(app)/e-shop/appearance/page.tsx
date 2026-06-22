import { Suspense } from "react";
import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { adminFillViewportBelowTopBarClassName } from "@/shared/components/layouts/layoutPageTokens";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import LoadingState from "@/shared/components/LoadingState";
import AppearancePageContent from "./AppearancePageContent";

export const dynamic = "force-dynamic";

export default async function EShopAppearancePage() {
  const company = await GetCompanyUseCase.execute();

  return (
    <BasicPageLayout
      title="Apariencia eShop"
      subtitle="Elija una plantilla de colores y personalice la identidad visual de su tienda en línea."
      className={adminFillViewportBelowTopBarClassName}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-test-id="eshop-appearance-page"
    >
      {company?.id == null ? (
        <p className="text-sm text-muted-foreground">No se pudo cargar la empresa activa.</p>
      ) : (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto p-1">
          <Suspense
            fallback={
              <LoadingState className="flex items-center justify-center py-8" data-test-id="eshop-appearance-loading" />
            }
          >
            <AppearancePageContent companyId={company.id} />
          </Suspense>
        </div>
      )}
    </BasicPageLayout>
  );
}
