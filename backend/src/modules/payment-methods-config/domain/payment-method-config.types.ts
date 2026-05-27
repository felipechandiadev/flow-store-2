import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';

/**
 * Catálogo de medios de pago configurado a nivel **empresa**.
 * Vive en `companies.settings.paymentMethods` (JSON).
 *
 * - El `id` es UUID estable; se referencia desde `pos_payment_methods`
 *   y se persiste como snapshot en `transactions.metadata.paymentSnapshot`.
 * - El `method` reusa el enum global `PaymentMethod` para mantener
 *   compatibilidad con asientos contables y reglas existentes.
 */
export interface CompanyPaymentMethodConfig {
  id: string;
  method: PaymentMethod;
  alias?: string | null;
  displayOrder: number;
  isActive: boolean;
  requireReference: boolean;
  bankAccountKey?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Configuración por **POS** asociada a una entrada del catálogo de empresa.
 * Vive en `points_of_sale.settings.paymentMethods` (JSON).
 *
 * No re-define semántica del medio (alias/banco viven en empresa).
 * Aquí solo controla habilitación local y UX en pwa-pos.
 */
export interface PosPaymentMethodConfig {
  companyPaymentMethodId: string;
  isEnabled: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder?: number | null;
  isDefaultForChange: boolean;
  /**
   * Preferencia por POS para transferencias: cuenta bancaria destino (empresa).
   * Si no se define, se puede heredar desde el catálogo de empresa.
   */
  bankAccountKey?: string | null;
  /**
   * Override por POS de "pide referencia". Si es `null`/`undefined`,
   * se hereda del catálogo de empresa al resolver el efectivo.
   * Permite que un mismo medio pida o no referencia según el POS.
   */
  requireReference?: boolean | null;
}

/**
 * Vista resuelta (merge company+POS) lista para consumir desde pwa-pos.
 * Es el contrato que retorna `GET /api/pos/me/payment-methods`.
 */
export interface EffectivePaymentMethod {
  companyPaymentMethodId: string;
  method: PaymentMethod;
  label: string;
  alias?: string | null;
  bankAccountKey?: string | null;
  requireReference: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange: boolean;
  displayOrder: number;
}

/**
 * Conjunto de métodos no aptos para flujos POS (caja física):
 * `MIXED` es un agregado, `CREDIT`/`INTERNAL_CREDIT` son estados de
 * documento (cuentas por cobrar), no medios tangibles para el cajero.
 */
export const POS_INVALID_METHODS = new Set<PaymentMethod>([
  PaymentMethod.MIXED,
  PaymentMethod.CREDIT,
  PaymentMethod.INTERNAL_CREDIT,
]);

/**
 * Medios implícitos del sistema: siempre disponibles en POS vía flujos
 * contextuales (panel cliente / cumplir encargo), no configurables por POS
 * ni listados en el catálogo efectivo de caja.
 */
export const POS_IMPLICIT_PAYMENT_METHODS = new Set<PaymentMethod>([
  PaymentMethod.CUSTOMER_CREDIT_NOTE,
  PaymentMethod.ORDER_ADVANCE,
]);

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.CREDIT_CARD]: 'Tarjeta de crédito',
  [PaymentMethod.DEBIT_CARD]: 'Tarjeta de débito',
  [PaymentMethod.TRANSFER]: 'Transferencia',
  [PaymentMethod.CHECK]: 'Cheque',
  [PaymentMethod.CREDIT]: 'Crédito',
  [PaymentMethod.INTERNAL_CREDIT]: 'Crédito interno',
  [PaymentMethod.CUSTOMER_CREDIT_NOTE]: 'Nota de crédito cliente',
  [PaymentMethod.ORDER_ADVANCE]: 'Abono por encargo',
  [PaymentMethod.MIXED]: 'Mixto',
};

/** Medios cuya referencia es obligatoria y no puede desactivarse en empresa ni POS. */
export const PAYMENT_METHODS_ALWAYS_REQUIRE_REFERENCE = new Set<PaymentMethod>([
  PaymentMethod.CUSTOMER_CREDIT_NOTE,
  PaymentMethod.ORDER_ADVANCE,
]);
