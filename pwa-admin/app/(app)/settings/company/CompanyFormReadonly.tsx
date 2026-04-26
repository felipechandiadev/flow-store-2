"use client";

import TextField from "@/shared/components/TextField";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";

const noop = () => {};

type Props = {
  company: CompanyDetails;
};

/**
 * Muestra los datos de la compañía en `TextField` (solo lectura) hasta contar con edición.
 */
export function CompanyFormReadonly({ company }: Props) {
  const idText = company.id ?? "—";
  const activeLabel = company.isActive ? "Sí" : "No";
  const fiscal = company.fiscalYearStart ?? "—";
  const settingsText =
    Object.keys(company.settings).length > 0 ? JSON.stringify(company.settings, null, 2) : "—";
  const bankText =
    company.bankAccounts.length > 0 ? JSON.stringify(company.bankAccounts, null, 2) : "—";

  return (
    <div
      className="flex w-full min-w-0 max-w-2xl flex-col gap-4"
      data-test-id="settings-company-form-readonly"
    >
      <TextField
        label="Identificador"
        placeholder="Identificador"
        value={idText}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-id"
      />
      <TextField
        label="Razón social"
        placeholder="Razón social"
        value={company.razonSocial}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-razon-social"
      />
      <TextField
        label="Nombre de fantasía"
        placeholder="Nombre de fantasía"
        value={company.nombreFantasia ?? "—"}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-nombre-fantasia"
      />
      <TextField
        label="Actividad comercial"
        placeholder="Actividad comercial"
        value={company.businessActivity ?? "—"}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-business-activity"
      />
      <TextField
        label="RUT"
        placeholder="RUT"
        value={company.rut ?? "—"}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-rut"
      />
      <TextField
        label="Moneda por defecto"
        placeholder="Moneda por defecto"
        value={company.defaultCurrency}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-currency"
      />
      <TextField
        label="Inicio del ejercicio fiscal"
        placeholder="Inicio del ejercicio fiscal"
        value={fiscal}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-fiscal"
      />
      <TextField
        label="Activo"
        placeholder="Activo"
        value={activeLabel}
        onChange={noop}
        readOnly
        data-test-id="settings-company-field-active"
      />
      <TextField
        label="Ajustes (JSON)"
        placeholder="Ajustes (JSON)"
        value={settingsText}
        onChange={noop}
        readOnly
        rows={4}
        data-test-id="settings-company-field-settings"
      />
      <TextField
        label="Cuentas bancarias (JSON)"
        placeholder="Cuentas bancarias (JSON)"
        value={bankText}
        onChange={noop}
        readOnly
        rows={4}
        data-test-id="settings-company-field-bank"
      />
    </div>
  );
}
