import { Suspense } from "react";
import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { adminFillViewportBelowTopBarClassName } from "@/shared/components/layouts/layoutPageTokens";
import LoadingState from "@/shared/components/LoadingState";
import AccountsPayablePageContent from "./AccountsPayablePageContent";

export const dynamic = "force-dynamic";

export default function AccountsPayablePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <BasicPageLayout
      title="Cuentas por pagar"
      subtitle="Obligaciones de pago pendientes: compras, remuneraciones y gastos operativos."
      className={adminFillViewportBelowTopBarClassName}
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      data-test-id="accounting-accounts-payable-page"
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <Suspense
          fallback={
            <LoadingState
              className="flex items-center justify-center py-4"
              data-test-id="accounts-payable-loading"
            />
          }
        >
          <AccountsPayablePageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </BasicPageLayout>
  );
}
