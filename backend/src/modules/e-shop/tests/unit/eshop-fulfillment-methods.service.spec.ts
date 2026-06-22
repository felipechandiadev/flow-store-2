import { EShopFulfillmentMethodsService } from '../../application/eshop-fulfillment-methods.service';
import type { EShopFulfillmentMethod } from '../../domain/e-shop-fulfillment-method.entity';

describe('EShopFulfillmentMethodsService.calculateShippingCost', () => {
  const svc = new EShopFulfillmentMethodsService({} as never);

  const base = (type: EShopFulfillmentMethod['type'], extra?: Partial<EShopFulfillmentMethod>) =>
    ({
      id: '1',
      companyId: 'c1',
      code: 'x',
      name: 'X',
      type,
      priceFlat: 3000,
      freeShippingThreshold: 100_000,
      isActive: true,
      sortOrder: 0,
      requiresAddress: false,
      requiresPhone: false,
      ...extra,
    }) as EShopFulfillmentMethod;

  it('PICKUP is free', () => {
    expect(svc.calculateShippingCost(base('PICKUP'), 50_000, null)).toBe(0);
  });

  it('FLAT_RATE uses priceFlat', () => {
    expect(svc.calculateShippingCost(base('FLAT_RATE'), 0, null)).toBe(3000);
  });

  it('FREE_OVER_THRESHOLD waives cost over threshold', () => {
    expect(svc.calculateShippingCost(base('FREE_OVER_THRESHOLD'), 120_000, null)).toBe(0);
    expect(svc.calculateShippingCost(base('FREE_OVER_THRESHOLD'), 50_000, null)).toBe(3000);
  });
});
