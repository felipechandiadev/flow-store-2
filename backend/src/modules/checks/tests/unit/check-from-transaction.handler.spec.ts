import { CheckFromTransactionHandler } from '@modules/checks/application/handlers/check-from-transaction.handler';
import { CheckDirection } from '@modules/checks/domain/check.entity';
import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';

describe('CheckFromTransactionHandler', () => {
  let handler: CheckFromTransactionHandler;
  let checks: { createFromTransactionPayment: jest.Mock };

  beforeEach(() => {
    checks = { createFromTransactionPayment: jest.fn().mockResolvedValue({}) };
    handler = new CheckFromTransactionHandler(checks as any);
  });

  function tx(overrides: any = {}) {
    return {
      id: 'tx-1',
      companyId: 'co-1',
      transactionType: TransactionType.SALE,
      paymentMethod: PaymentMethod.CASH,
      currency: 'CLP',
      total: 0,
      metadata: {},
      ...overrides,
    };
  }

  it('does nothing for transaction types unrelated to payments', async () => {
    await handler.handle(
      new TransactionCreatedEvent(
        tx({ transactionType: TransactionType.PURCHASE_ORDER }) as any,
        'co-1',
      ),
    );
    expect(checks.createFromTransactionPayment).not.toHaveBeenCalled();
  });

  it('skips when endorsedFromCheckId is set (avoid duplicate)', async () => {
    await handler.handle(
      new TransactionCreatedEvent(
        tx({
          transactionType: TransactionType.SUPPLIER_PAYMENT,
          paymentMethod: PaymentMethod.CHECK,
          metadata: {
            endorsedFromCheckId: 'chk-1',
            checkData: { checkNumber: '9999', bankName: 'BCI' },
          },
        }) as any,
        'co-1',
      ),
    );
    expect(checks.createFromTransactionPayment).not.toHaveBeenCalled();
  });

  it('creates INCOMING checks for every CHECK paymentSnapshot in a SALE', async () => {
    await handler.handle(
      new TransactionCreatedEvent(
        tx({
          transactionType: TransactionType.SALE,
          metadata: {
            paymentSnapshots: [
              {
                method: 'CASH',
                amount: 1000,
              },
              {
                method: 'CHECK',
                amount: 50000,
                checkData: {
                  checkNumber: '1001',
                  bankName: 'BCI',
                  drawerName: 'Juan',
                },
              },
              {
                method: 'CHECK',
                amount: 25000,
                checkData: {
                  checkNumber: '1002',
                  bankName: 'Santander',
                },
              },
            ],
          },
        }) as any,
        'co-1',
      ),
    );
    expect(checks.createFromTransactionPayment).toHaveBeenCalledTimes(2);
    expect(checks.createFromTransactionPayment.mock.calls[0][0]).toMatchObject({
      direction: CheckDirection.INCOMING,
      checkNumber: '1001',
      amount: 50000,
    });
  });

  it('creates OUTGOING check for SUPPLIER_PAYMENT with CHECK', async () => {
    await handler.handle(
      new TransactionCreatedEvent(
        tx({
          transactionType: TransactionType.SUPPLIER_PAYMENT,
          paymentMethod: PaymentMethod.CHECK,
          total: 75000,
          metadata: {
            checkData: {
              checkNumber: '8001',
              bankName: 'Banco Estado',
              payeeName: 'Proveedor X',
            },
          },
        }) as any,
        'co-1',
      ),
    );
    expect(checks.createFromTransactionPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: CheckDirection.OUTGOING,
        checkNumber: '8001',
        bankName: 'Banco Estado',
        amount: 75000,
      }),
    );
  });

  it('skips OUTGOING when paymentMethod is not CHECK', async () => {
    await handler.handle(
      new TransactionCreatedEvent(
        tx({
          transactionType: TransactionType.SUPPLIER_PAYMENT,
          paymentMethod: PaymentMethod.TRANSFER,
        }) as any,
        'co-1',
      ),
    );
    expect(checks.createFromTransactionPayment).not.toHaveBeenCalled();
  });

  it('skips check creation when checkData is missing required fields', async () => {
    await handler.handle(
      new TransactionCreatedEvent(
        tx({
          transactionType: TransactionType.SALE,
          metadata: {
            paymentSnapshots: [
              { method: 'CHECK', amount: 1000, checkData: null },
            ],
          },
        }) as any,
        'co-1',
      ),
    );
    expect(checks.createFromTransactionPayment).not.toHaveBeenCalled();
  });
});
