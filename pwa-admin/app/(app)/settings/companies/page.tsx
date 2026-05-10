import { Suspense } from "react";
import { listCompaniesAction } from "@/features/companies/actions/companies.action";
import { SettingsCompaniesCollection } from "./components/SettingsCompaniesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await listCompaniesAction(true);
  const companies = res.success ? res.companies : [];

  return (
    <Suspense
      fallback={
        <div
          className="p-4 text-sm text-muted md:p-6"
          data-test-id="companies-page-skeleton"
        >
          Cargando…
        </div>
      }
    >
      <SettingsCompaniesCollection initialCompanies={companies} />
    </Suspense>
  );
}
