"use client";

import TextField from "@/shared/components/TextField";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import { CompanyLogoSection } from "./CompanyLogoSection";

const noop = () => {};

type Props = {
  company: CompanyDetails;
};

/**
 * Datos de la compañía (solo lectura) y logo vía multimedia (`entityType: company`).
 */
export function CompanyFormReadonly({ company }: Props) {
  return (
    <div
      className="flex w-full min-w-0 max-w-full flex-col gap-8"
      data-test-id="settings-company-form-readonly"
    >
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Razón social"
          placeholder="Razón social"
          value={company.razonSocial}
          onChange={noop}
          readOnly
          className="min-w-0"
          data-test-id="settings-company-field-razon-social"
        />
        <TextField
          label="Nombre de fantasía"
          placeholder="Nombre de fantasía"
          value={company.nombreFantasia ?? "—"}
          onChange={noop}
          readOnly
          className="min-w-0"
          data-test-id="settings-company-field-nombre-fantasia"
        />
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="RUT"
          placeholder="RUT"
          value={company.rut ?? "—"}
          onChange={noop}
          readOnly
          className="min-w-0"
          data-test-id="settings-company-field-rut"
        />
        <TextField
          label="Actividad comercial"
          placeholder="Actividad comercial"
          value={company.businessActivity ?? "—"}
          onChange={noop}
          readOnly
          className="min-w-0"
          data-test-id="settings-company-field-business-activity"
        />
      </div>

      {company.id ? (
        <div className="flex w-full justify-center border-t border-border pt-6">
          <CompanyLogoSection companyId={company.id} />
        </div>
      ) : null}
    </div>
  );
}
