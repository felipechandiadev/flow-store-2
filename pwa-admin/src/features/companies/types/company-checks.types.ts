/**
 * Configuración de cheques de una empresa. Espejo del tipo backend en
 * `backend/src/modules/companies/domain/company-checks.types.ts`.
 * Se persiste en `company.settings.checks` (JSON).
 */
export interface CompanyCheckSettings {
  enabled: boolean;
  receiveChecks: boolean;
  issueChecks: boolean;
  allowPostdatedReceived: boolean;
  allowPostdatedIssued: boolean;
  defaultDepositBankAccountKey: string | null;
  defaultIssueBankAccountKey: string | null;
}

export function defaultCompanyCheckSettings(): CompanyCheckSettings {
  return {
    enabled: false,
    receiveChecks: false,
    issueChecks: false,
    allowPostdatedReceived: false,
    allowPostdatedIssued: false,
    defaultDepositBankAccountKey: null,
    defaultIssueBankAccountKey: null,
  };
}
