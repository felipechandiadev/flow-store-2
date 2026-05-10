"use client";

import { useRouter } from "next/navigation";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { ShareholderRow } from "@/features/settings-shareholders/types/shareholder.types";
import { CompanyGeneralSection } from "./CompanyGeneralSection";
import { CompanyLogoSection } from "./CompanyLogoSection";
import { CompanyBankAccountsSection } from "./CompanyBankAccountsSection";
import { CompanyPaymentMethodsSection } from "./CompanyPaymentMethodsSection";
import { CompanyChecksSection } from "./CompanyChecksSection";
import { CompanyQuotationsSection } from "./CompanyQuotationsSection";
import { CompanyPartnersSection } from "./CompanyPartnersSection";

type Props = {
  company: CompanyDetails;
  shareholders: ShareholderRow[];
};

export function CompanySettingsContent({ company, shareholders }: Props) {
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

          <CompanyPaymentMethodsSection companyId={company.id} />

          <CompanyChecksSection company={company} />

          <CompanyQuotationsSection company={company} />

          {company.id ? (
            <CompanyPartnersSection companyId={company.id} shareholders={shareholders} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
