"use client";

import { useRouter } from "next/navigation";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { CompanyGeneralSection } from "./CompanyGeneralSection";
import { CompanyLogoSection } from "./CompanyLogoSection";
import { CompanyBankAccountsSection } from "./CompanyBankAccountsSection";

type Props = {
  company: CompanyDetails;
};

export function CompanySettingsContent({ company }: Props) {
  const router = useRouter();

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-10" data-test-id="settings-company-layout">
      <CompanyGeneralSection company={company} onSaved={() => router.refresh()} />

      {company.id ? (
        <>
          <section data-test-id="settings-company-logo-section-wrapper">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Logo de la empresa</h2>
            <div className="flex w-full justify-center p-6 pt-2">
              <CompanyLogoSection companyId={company.id} embedded />
            </div>
          </section>

          <CompanyBankAccountsSection company={company} />
        </>
      ) : null}
    </div>
  );
}
