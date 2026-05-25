import { BadRequestException } from '@nestjs/common';
import { SalesFromSessionService } from '../../application/sales-from-session.service';

describe('SalesFromSessionService — deferPayment', () => {
  function buildService() {
    const registerPosCommercial = jest.fn().mockResolvedValue({ success: true });
    const service = Object.create(SalesFromSessionService.prototype) as SalesFromSessionService;
    Object.assign(service, { registerPosCommercial });
    return { service, registerPosCommercial };
  }

  it('rejects deferPayment when fulfilling a backorder', async () => {
    const { service, registerPosCommercial } = buildService();
    await expect(
      service.createSale({
        userName: 'cashier',
        pointOfSaleId: 'pos-1',
        cashSessionId: 'session-1',
        paymentMethod: 'CASH',
        deferPayment: true,
        fulfillBackorderId: 'bo-1',
        lines: [{ productVariantId: 'v1', quantity: 1, unitPrice: 1000 }],
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(registerPosCommercial).not.toHaveBeenCalled();
  });

  it('passes deferPayment to registerPosCommercial', async () => {
    const { service, registerPosCommercial } = buildService();
    await service.createSale({
      userName: 'cashier',
      pointOfSaleId: 'pos-1',
      cashSessionId: 'session-1',
      paymentMethod: 'CASH',
      deferPayment: true,
      customerId: 'cust-1',
      lines: [{ productVariantId: 'v1', quantity: 1, unitPrice: 1000 }],
    } as never);
    expect(registerPosCommercial).toHaveBeenCalledWith(
      expect.objectContaining({ deferPayment: true, customerId: 'cust-1' }),
      expect.objectContaining({ deferPayment: true }),
    );
  });
});
