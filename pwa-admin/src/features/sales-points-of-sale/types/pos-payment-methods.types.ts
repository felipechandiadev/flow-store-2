import type {
  CompanyPaymentMethodConfig,
  CompanyPaymentMethodId,
} from "@/features/companies/types/company-payment-methods.types";

/** Configuración local del POS para un medio del catálogo de empresa. */
export interface PosPaymentMethodConfig {
  companyPaymentMethodId: string;
  isEnabled: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder?: number | null;
  isDefaultForChange: boolean;
  /**
   * Override por POS de "pide referencia". `null` = heredar del catálogo
   * de empresa al resolver el efectivo en pwa-pos.
   */
  requireReference?: boolean | null;
}

/** Vista efectiva (merge company+POS) que entrega el backend al pwa-pos. */
export interface EffectivePaymentMethod {
  companyPaymentMethodId: string;
  method: CompanyPaymentMethodId;
  label: string;
  alias?: string | null;
  bankAccountKey?: string | null;
  requireReference: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange: boolean;
  displayOrder: number;
}

/** Crea valores default para una entrada nueva del POS apuntando al catálogo. */
export function defaultPosEntryFor(
  cmp: CompanyPaymentMethodConfig,
  isCash: boolean,
): PosPaymentMethodConfig {
  return {
    companyPaymentMethodId: cmp.id,
    isEnabled: true,
    preloadOnPaymentScreen: isCash,
    preloadOrder: isCash ? 0 : null,
    isDefaultForChange: isCash,
    requireReference: cmp.requireReference ?? false,
  };
}
