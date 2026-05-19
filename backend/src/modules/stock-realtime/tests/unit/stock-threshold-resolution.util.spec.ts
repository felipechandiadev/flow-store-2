import {
  resolveStockThresholds,
  sumVariantPhysicalStock,
} from '../../stock-threshold-resolution.util';

describe('resolveStockThresholds', () => {
  const variant = { minimumStock: 80, maximumStock: 0, reorderPoint: 0 };

  it('does not alert when only one storage is 0 but total meets variant minimum', () => {
    const resolved = resolveStockThresholds(variant, {
      storageId: 'deposito',
      productVariantId: 'v1',
      physicalStock: 0,
      minimumStock: null,
    }, { totalPhysicalStock: 120 });

    expect(resolved.scope).toBe('variant_total');
    expect(resolved.alerts).toEqual([]);
  });

  it('alerts when variant total is below minimum', () => {
    const resolved = resolveStockThresholds(variant, {
      storageId: 'deposito',
      productVariantId: 'v1',
      physicalStock: 0,
      minimumStock: null,
    }, { totalPhysicalStock: 50 });

    expect(resolved.alerts).toEqual(['below_minimum']);
  });

  it('alerts per storage when storage has its own minimum override', () => {
    const resolved = resolveStockThresholds(variant, {
      storageId: 'deposito',
      productVariantId: 'v1',
      physicalStock: 50,
      minimumStock: 80,
    }, { totalPhysicalStock: 500 });

    expect(resolved.scope).toBe('storage');
    expect(resolved.alerts).toEqual(['below_minimum']);
  });
});

describe('sumVariantPhysicalStock', () => {
  it('sums all storages and applies override', () => {
    const total = sumVariantPhysicalStock(
      [
        { storageId: 'a', physicalStock: 100 },
        { storageId: 'b', physicalStock: 20 },
      ],
      { storageId: 'b', physical: 0 },
    );
    expect(total).toBe(100);
  });
});
