import type { PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";

/**
 * Vista efectiva de un medio de pago: ya resuelta por el backend
 * combinando el catálogo de empresa con la configuración del POS.
 *
 * Incluye los datos necesarios para pintar el medio en `/pos/payment`,
 * decidir precarga inicial y validar referencia.
 */
export interface EffectivePaymentMethod {
  /** Id estable del catálogo de empresa (`companies.settings.paymentMethods[].id`). */
  companyPaymentMethodId: string;
  /** Tipo semántico (enum compartido con backend). */
  method: PosPaymentMethodId | string;
  /** Etiqueta para UI: alias si existe, si no nombre del enum. */
  label: string;
  alias?: string | null;
  bankAccountKey?: string | null;
  requireReference: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange: boolean;
  displayOrder: number;
}

export type EffectivePaymentMethodsResponse =
  | { success: true; paymentMethods: EffectivePaymentMethod[] }
  | { success: false; message: string };
