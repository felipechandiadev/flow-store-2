import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import {
  buildDefaultCompanyCatalog,
  defaultCompanyPaymentMethodId,
  mergeCompanyAndPos,
  sanitizeCompanyPaymentMethod,
  syncPosPaymentMethodsWithCatalog,
  validateCompanyPaymentMethods,
} from './payment-method-config.helpers';
import type { PosPaymentMethodConfig } from './payment-method-config.types';

describe('payment-method-config.helpers', () => {
  it('buildDefaultCompanyCatalog uses stable ids per method', () => {
    const a = buildDefaultCompanyCatalog();
    const b = buildDefaultCompanyCatalog();
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    expect(a.find((x) => x.method === PaymentMethod.CASH)?.id).toBe(
      defaultCompanyPaymentMethodId(PaymentMethod.CASH),
    );
  });

  it('forces requireReference for CUSTOMER_CREDIT_NOTE and ORDER_ADVANCE', () => {
    const list = validateCompanyPaymentMethods([
      {
        method: PaymentMethod.CUSTOMER_CREDIT_NOTE,
        requireReference: false,
      },
      {
        method: PaymentMethod.ORDER_ADVANCE,
        requireReference: false,
      },
    ]);
    expect(list[0].requireReference).toBe(true);
    expect(list[1].requireReference).toBe(true);
  });

  it('syncPosPaymentMethodsWithCatalog adds new company methods as disabled', () => {
    const cash = sanitizeCompanyPaymentMethod({ method: PaymentMethod.CASH }, 0);
    const advance = sanitizeCompanyPaymentMethod(
      { method: PaymentMethod.ORDER_ADVANCE },
      1,
    );
    const existing: PosPaymentMethodConfig[] = [
      {
        companyPaymentMethodId: cash.id,
        isEnabled: true,
        preloadOnPaymentScreen: true,
        preloadOrder: 0,
        isDefaultForChange: true,
      },
    ];
    const synced = syncPosPaymentMethodsWithCatalog([cash, advance], existing);
    expect(synced).toHaveLength(2);
    expect(synced.find((s) => s.companyPaymentMethodId === advance.id)?.isEnabled).toBe(
      false,
    );
  });

  it('mergeCompanyAndPos keeps requireReference true even if POS disables it', () => {
    const company = [
      sanitizeCompanyPaymentMethod(
        { method: PaymentMethod.ORDER_ADVANCE, requireReference: true },
        0,
      ),
    ];
    const effective = mergeCompanyAndPos(company, [
      {
        companyPaymentMethodId: company[0].id,
        isEnabled: true,
        preloadOnPaymentScreen: false,
        preloadOrder: null,
        isDefaultForChange: false,
        requireReference: false,
      },
    ]);
    expect(effective[0]?.requireReference).toBe(true);
  });
});
