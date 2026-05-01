import { Suspense } from "react";
import { listChartOfAccountsForPage } from "@/features/accounting-chart-of-accounts/actions/chart-of-accounts.action";
import ChartOfAccountsDataGrid from "./ui/ChartOfAccountsDataGrid";
import { CollectionPageLayout } from "@/shared/components/layouts";
import { ChartOfAccountsCollectionAddAction } from "./ui/ChartOfAccountsCollectionAddAction";

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const includeInactiveRaw = parseSp(sp, "includeInactive");
  const includeInactive = includeInactiveRaw === "true" || includeInactiveRaw === "1";

  const result = await listChartOfAccountsForPage({ includeInactive });
  const hierarchy = result.success ? result.data.hierarchy : [];

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="coa-page-skeleton">
          Cargando…
        </div>
      }
    >
      <CollectionPageLayout
        title="Plan de cuentas"
        subtitle="Estructura jerárquica de cuentas contables."
        addAction={<ChartOfAccountsCollectionAddAction hierarchy={hierarchy} />}
        showSearch
        searchParamName="search"
        searchLabel="Buscar"
        searchPlaceholder="Buscar por código, nombre o tipo"
        data-test-id="coa-page"
      >
        <ChartOfAccountsDataGrid hierarchy={hierarchy} />
      </CollectionPageLayout>
    </Suspense>
  );
}

