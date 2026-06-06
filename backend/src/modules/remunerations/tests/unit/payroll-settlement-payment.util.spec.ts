import { PaymentStatus } from '@modules/transactions/domain/transaction.entity';
import {
  resolvePayrollPaymentLines,
  shouldCreatePayrollPaymentChildren,
} from '@modules/remunerations/application/payroll-settlement-payment.util';

describe('resolvePayrollPaymentLines', () => {
  it('sin settlementPayment no crea cuotas (modo PENDING)', () => {
    const plan = resolvePayrollPaymentLines(undefined, 500_000, '2026-06-02');
    expect(plan.mode).toBe('PENDING');
    expect(plan.paidLines).toEqual([]);
    expect(plan.scheduledLines).toEqual([]);
    expect(plan.parentPaymentStatus).toBe(PaymentStatus.PENDING);
    expect(plan.parentAmountPaid).toBe(0);
  });

  it('modo inválido lanza error', () => {
    expect(() =>
      resolvePayrollPaymentLines(
        {
          mode: 'PAGO_PENDIENTE' as any,
          paidLines: [],
          scheduledLines: [],
        },
        500_000,
        '2026-06-02',
      ),
    ).toThrow();
  });

  it('shouldCreatePayrollPaymentChildren es false en PENDING', () => {
    expect(
      shouldCreatePayrollPaymentChildren({
        mode: 'PENDING',
        paidLines: [{ dueDate: '2026-06-02', amount: 900_000 }],
        scheduledLines: [],
      }),
    ).toBe(false);
  });

  it('shouldCreatePayrollPaymentChildren es true en PENDING_SCHEDULED con cuotas', () => {
    expect(
      shouldCreatePayrollPaymentChildren({
        mode: 'PENDING_SCHEDULED',
        paidLines: [],
        scheduledLines: [{ dueDate: '2026-06-02', amount: 900_000 }],
      }),
    ).toBe(true);
  });

  it('modo PENDING no incluye líneas aunque vengan en el payload', () => {
    const plan = resolvePayrollPaymentLines(
      {
        mode: 'PENDING',
        paidLines: [{ dueDate: '2026-06-02', amount: 100 }],
        scheduledLines: [{ dueDate: '2026-06-02', amount: 400_000 }],
      },
      500_000,
      '2026-06-02',
    );
    expect(plan.mode).toBe('PENDING');
    expect(plan.paidLines).toEqual([]);
    expect(plan.scheduledLines).toEqual([]);
  });
});
