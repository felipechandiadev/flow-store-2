import { BasicPageLayout } from "@/shared/components/layouts";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { CompanyFormReadonly } from "./CompanyFormReadonly";

export default async function Page() {
  const company = await GetCompanyUseCase.execute();

  return (
    <BasicPageLayout
      title="Empresa"
      className="min-w-0 w-full max-w-none"
      contentClassName="min-w-0 w-full max-w-full"
      data-test-id="settings-company-page"
    >
      {company == null ? (
        <p className="text-sm text-muted">No se pudo cargar la empresa. Revisa la sesión y el API.</p>
      ) : (
        <CompanyFormReadonly company={company} />
      )}
    </BasicPageLayout>
  );
}
