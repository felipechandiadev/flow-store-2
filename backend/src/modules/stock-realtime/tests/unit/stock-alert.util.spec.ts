import { computeStockAlertsFromThresholds } from '../../stock-alert.util';

describe('computeStockAlertsFromThresholds', () => {
  const thresholds = { min: 10, max: 100, reorder: 5 };

  it('returns only below_minimum when stock is under min (and under reorder)', () => {
    expect(computeStockAlertsFromThresholds(3, thresholds)).toEqual([
      'below_minimum',
    ]);
  });

  it('returns only reorder when above min but at or below reorder point', () => {
    expect(
      computeStockAlertsFromThresholds(8, { min: 5, max: 100, reorder: 10 }),
    ).toEqual(['reorder']);
  });

  it('returns only above_maximum when over max', () => {
    expect(computeStockAlertsFromThresholds(150, thresholds)).toEqual([
      'above_maximum',
    ]);
  });

  it('returns empty when within range', () => {
    expect(computeStockAlertsFromThresholds(50, thresholds)).toEqual([]);
  });
});
