import { Suspense } from "react";
import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { adminFillViewportBelowTopBarClassName } from "@/shared/components/layouts/layoutPageTokens";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import LoadingState from "@/shared/components/LoadingState";
import FooterPageContent from "./FooterPageContent";

export const dynamic = "force-dynamic";

export default async function EShopFooterPage() {
  const company = await GetCompanyUseCase.execute();

  return (
    <BasicPageLayout
      title="Footer eShop"
      subtitle="Configure el pie de página de su tienda: columnas, enlaces y bloques visibles."
      className={adminFillViewportBelowTopBarClassName}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-test-id="eshop-footer-page"
    >
      {company?.id == null ? (
        <p className="text-sm text-muted-foreground">No se pudo cargar la empresa activa.</p>
      ) : (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto p-1">
          <Suspense
            fallback={
              <LoadingState
                className="flex items-center justify-center py-8"
                data-test-id="eshop-footer-loading"
              />
            }
          >
            <FooterPageContent
              companyId={company.id}
              companyName={company.nombreFantasia || company.razonSocial || "Mi tienda"}
            />
          </Suspense>
        </div>
      )}
    </BasicPageLayout>
  );
}
