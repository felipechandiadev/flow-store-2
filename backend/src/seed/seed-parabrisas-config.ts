import { createHash } from 'node:crypto';
import { AccountTypeName, BankName } from '@modules/persons/domain/person.entity';
import type { CompanyBankAccount } from '@modules/companies/domain/company.entity';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import type {
  CompanyPaymentMethodConfig,
  PosPaymentMethodConfig,
} from '@modules/payment-methods-config/domain/payment-method-config.types';

/** Parabrisas Don Walter — datos operativos de referencia para el seed mínimo. */
export const SEED_PARABRISAS = {
  razonSocial: 'Walter Parada Vargas',
  nombreFantasia: 'Parabrisas don Walter',
  rut: '11.566.882-K',
  mail: 'walter.parada.v@gmail.com',
  address: 'Ignacio Carrera Pinto N°734 , Parral',
  businessActivity: 'Venta de parabrisas y vidrios automotrices',
  defaultCurrency: 'CLP',
} as const;

export const SEED_BRANCH_NAME = 'Local Principal';
export const SEED_BRANCH_ADDRESS = SEED_PARABRISAS.address;
export const SEED_BRANCH_PHONE = '+56984395102';
export const SEED_BRANCH_LOCATION = {
  lat: -36.146,
  lng: -71.826,
};

export const SEED_STORAGE_SALA_NAME = 'Sala de venta';
export const SEED_STORAGE_SALA_CODE = 'SEED-SALA-VENTA';

export const SEED_PRICE_LIST_NAME = 'UNICA';
export const SEED_POS_NAME = 'CAJA LOCAL';
export const SEED_CASH_HUB_CODE = 'CENTRAL';
export const SEED_CASH_HUB_NAME = 'Centro de efectivo central';

const SEED_PM_NAMESPACE = 'flowstore-seed-pm-parabrisas-v1';

/** IDs estables por método para que el seed sea idempotente entre ejecuciones. */
export function seedPaymentMethodId(method: PaymentMethod): string {
  const h = createHash('sha256').update(`${SEED_PM_NAMESPACE}:${method}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    h.slice(16, 20),
    h.slice(20, 32),
  ].join('-');
}

const SEED_COMPANY_BANK_ACCOUNT_KEY = 'seed-parabrisas-falabella-cc';

export function buildSeedCompanyBankAccounts(
  accountHolderName: string,
): CompanyBankAccount[] {
  return [
    {
      accountKey: SEED_COMPANY_BANK_ACCOUNT_KEY,
      bankName: BankName.BANCO_FALABELLA,
      accountType: AccountTypeName.CUENTA_CORRIENTE,
      accountNumber: '19994412711',
      accountHolderName,
      isPrimary: true,
      notes: null,
    },
  ];
}

const COMPANY_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.TRANSFER,
  PaymentMethod.CUSTOMER_CREDIT_NOTE,
  PaymentMethod.ORDER_ADVANCE,
];

export function buildSeedCompanyPaymentCatalog(): CompanyPaymentMethodConfig[] {
  return COMPANY_PAYMENT_METHODS.map((method, displayOrder) => ({
    id: seedPaymentMethodId(method),
    method,
    alias: null,
    displayOrder,
    isActive: true,
    requireReference: false,
    bankAccountKey: null,
    metadata: null,
  }));
}

type PosMethodSeed = {
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange?: boolean;
};

const POS_METHOD_SEED: Partial<Record<PaymentMethod, PosMethodSeed>> = {
  [PaymentMethod.CASH]: {
    preloadOnPaymentScreen: true,
    preloadOrder: 0,
    isDefaultForChange: true,
  },
  [PaymentMethod.CREDIT_CARD]: {
    preloadOnPaymentScreen: true,
    preloadOrder: 1,
  },
  [PaymentMethod.DEBIT_CARD]: {
    preloadOnPaymentScreen: true,
    preloadOrder: 2,
  },
  [PaymentMethod.TRANSFER]: {
    preloadOnPaymentScreen: true,
    preloadOrder: 3,
  },
  [PaymentMethod.CUSTOMER_CREDIT_NOTE]: {
    preloadOnPaymentScreen: false,
    preloadOrder: null,
  },
  [PaymentMethod.ORDER_ADVANCE]: {
    preloadOnPaymentScreen: false,
    preloadOrder: null,
  },
};

export function buildSeedPosPaymentList(
  catalog: CompanyPaymentMethodConfig[],
): PosPaymentMethodConfig[] {
  return catalog.map((cmp) => {
    const cfg = POS_METHOD_SEED[cmp.method] ?? {
      preloadOnPaymentScreen: false,
      preloadOrder: null,
    };
    return {
      companyPaymentMethodId: cmp.id,
      isEnabled: true,
      preloadOnPaymentScreen: cfg.preloadOnPaymentScreen,
      preloadOrder: cfg.preloadOrder,
      isDefaultForChange:
        cmp.method === PaymentMethod.CASH && cfg.isDefaultForChange === true,
      bankAccountKey: cmp.bankAccountKey ?? null,
      requireReference: null,
    };
  });
}

export function buildSeedCompanySettings(
  existing: Record<string, unknown> | null | undefined,
  paymentMethods: CompanyPaymentMethodConfig[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' ? { ...existing } : {};

  return {
    ...base,
    paymentMethods,
    checks: {
      enabled: false,
      receiveChecks: false,
      issueChecks: false,
      allowPostdatedReceived: false,
      allowPostdatedIssued: false,
      defaultDepositBankAccountKey: null,
      defaultIssueBankAccountKey: null,
    },
    quotations: {
      enabled: true,
      defaultValidityDays: 10,
      maxValidityDays: 20,
      allowCustomValidity: true,
      defaultTerms: null,
    },
    internalCustomerCredit: {
      enabled: false,
    },
  };
}
