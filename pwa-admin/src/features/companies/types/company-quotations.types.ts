/**
 * Configuración de cotizaciones de una empresa. Espejo del tipo backend
 * en `backend/src/modules/companies/domain/company-quotations.types.ts`.
 */
export interface CompanyQuotationSettings {
  enabled: boolean;
  defaultValidityDays: number;
  maxValidityDays: number;
  allowCustomValidity: boolean;
  defaultTerms: string | null;
  allowExpiredConversion: boolean;
  reExpiredPricesOnConversion: boolean;
}

export function defaultCompanyQuotationSettings(): CompanyQuotationSettings {
  return {
    enabled: true,
    defaultValidityDays: 15,
    maxValidityDays: 60,
    allowCustomValidity: true,
    defaultTerms: null,
    allowExpiredConversion: true,
    reExpiredPricesOnConversion: false,
  };
}
