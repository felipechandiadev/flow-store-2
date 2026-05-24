import {
  formatCashHubCode,
  nextCashHubCodeFromExisting,
  parseCashHubCodeSequence,
} from '../../application/cash-hub-code.util';

describe('cash-hub-code.util', () => {
  it('parseCashHubCodeSequence accepts CEV-#####', () => {
    expect(parseCashHubCodeSequence('CEV-00001')).toBe(1);
    expect(parseCashHubCodeSequence('cev-00042')).toBe(42);
    expect(parseCashHubCodeSequence('CENTRAL')).toBeNull();
    expect(parseCashHubCodeSequence(null)).toBeNull();
  });

  it('nextCashHubCodeFromExisting increments max CEV sequence', () => {
    expect(nextCashHubCodeFromExisting(['CENTRAL', 'CEV-00002', 'CEV-00001'])).toBe(
      'CEV-00003',
    );
    expect(nextCashHubCodeFromExisting([])).toBe('CEV-00001');
  });

  it('formatCashHubCode pads to 5 digits', () => {
    expect(formatCashHubCode(2)).toBe('CEV-00002');
  });
});
