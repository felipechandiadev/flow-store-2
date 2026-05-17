import {
  companyPaymentMethodAlwaysRequiresReference,
  POS_VALID_METHOD_IDS,
  type CompanyPaymentMethodConfig,
  type CompanyPaymentMethodId,
} from "@/features/companies/types/company-payment-methods.types";

/** Configuración local del POS para un medio del catálogo de empresa. */
export interface PosPaymentMethodConfig {
  companyPaymentMethodId: string;
  isEnabled: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder?: number | null;
  isDefaultForChange: boolean;
  bankAccountKey?: string | null;
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

/** Alinea config POS con catálogo empresa (incluye medios nuevos deshabilitados). */
export function syncPosPaymentDraftWithCatalog(
  catalog: CompanyPaymentMethodConfig[],
  posList: PosPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  const byId = new Map(posList.map((p) => [p.companyPaymentMethodId, p]));
  return catalog
    .filter((c) => c.isActive && (POS_VALID_METHOD_IDS as string[]).includes(c.method))
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((cmp) => {
      const existing = byId.get(cmp.id);
      if (existing) return existing;
      return {
        companyPaymentMethodId: cmp.id,
        isEnabled: false,
        preloadOnPaymentScreen: false,
        preloadOrder: null,
        isDefaultForChange: false,
        bankAccountKey: cmp.bankAccountKey ?? null,
        requireReference: companyPaymentMethodAlwaysRequiresReference(cmp.method) ? true : null,
      };
    });
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
    bankAccountKey: cmp.bankAccountKey ?? null,
    requireReference: companyPaymentMethodAlwaysRequiresReference(cmp.method)
      ? true
      : (cmp.requireReference ?? false),
  };
}
