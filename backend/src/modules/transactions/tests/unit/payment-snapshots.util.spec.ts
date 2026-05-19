import { PaymentMethod } from '../../domain/transaction.entity';
import {
  buildPaymentSnapshotsFromSalePayments,
  getPaymentSnapshotsFromMetadata,
  getRepresentativePaymentMethod,
  isMultiPayment,
} from '../../application/payment-snapshots.util';

describe('payment-snapshots.util', () => {
  it('builds snapshots from sale payments', () => {
    const snaps = buildPaymentSnapshotsFromSalePayments(
      [
        { paymentMethod: 'CASH', amount: 400 },
        { paymentMethod: 'DEBIT_CARD', amount: 900 },
      ],
      [],
      '2026-01-01T00:00:00.000Z',
    );
    expect(snaps).toHaveLength(2);
    expect(snaps[0].method).toBe('CASH');
    expect(snaps[1].amount).toBe(900);
  });

  it('reads canonical metadata.payments first', () => {
    const snaps = getPaymentSnapshotsFromMetadata({
      payments: [{ method: 'CASH', amount: 100, capturedAt: 'x' }],
    });
    expect(snaps).toHaveLength(1);
    expect(snaps[0].amount).toBe(100);
  });

  it('falls back to paymentSnapshots legacy key', () => {
    const snaps = getPaymentSnapshotsFromMetadata({
      paymentSnapshots: [{ method: 'TRANSFER', amount: 50, capturedAt: 'x' }],
    });
    expect(snaps[0].method).toBe('TRANSFER');
  });

  it('representative method is highest amount', () => {
    const snaps = buildPaymentSnapshotsFromSalePayments(
      [
        { paymentMethod: 'CASH', amount: 400 },
        { paymentMethod: 'DEBIT_CARD', amount: 900 },
      ],
      [],
    );
    expect(getRepresentativePaymentMethod(snaps)).toBe(PaymentMethod.DEBIT_CARD);
    expect(isMultiPayment(snaps)).toBe(true);
  });
});
