import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '../../application/dto/create-transaction.dto';
import {
  TransactionType,
  PaymentMethod,
} from '../../domain/transaction.entity';

describe('CreateTransactionDto', () => {
  describe('validate()', () => {
    it('should reject PAYMENT_OUT as deprecated', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.PAYMENT_OUT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.CASH;

      const errors = dto.validate();

      expect(errors).toContain(
        'PAYMENT_OUT está deprecado. Use SUPPLIER_PAYMENT o EXPENSE_PAYMENT según corresponda.',
      );
    });

    it('should accept SUPPLIER_PAYMENT as replacement for PAYMENT_OUT', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_PAYMENT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.CASH;
      dto.supplierId = '123e4567-e89b-12d3-a456-426614174000';
      dto.relatedTransactionId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = dto.validate();

      expect(errors).not.toContain('PAYMENT_OUT está deprecado');
      expect(errors.length).toBe(0);
    });

    it('should accept EXPENSE_PAYMENT as replacement for PAYMENT_OUT', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.EXPENSE_PAYMENT;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.pointOfSaleId = '123e4567-e89b-12d3-a456-426614174000';
      dto.subtotal = 100;
      dto.total = 100;
      dto.paymentMethod = PaymentMethod.CASH;
      dto.expenseCategoryId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = dto.validate();

      expect(errors).not.toContain('PAYMENT_OUT está deprecado');
      expect(errors.length).toBe(0);
    });

    it('should reject SUPPLIER_CREDIT_NOTE without purchaseReturnId in metadata', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_CREDIT_NOTE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.supplierId = '123e4567-e89b-12d3-a456-426614174001';
      dto.subtotal = 100;
      dto.total = 100;
      dto.metadata = { links: {} };
      dto.lines = [
        plainLine({ productName: 'x', quantity: 1, unitPrice: 100, subtotal: 100, total: 100 }),
      ];

      const errors = dto.validate();

      expect(errors.some((e) => e.includes('purchaseReturnId'))).toBe(true);
    });

    it('should accept SUPPLIER_CREDIT_NOTE with purchaseReturnId and lines', () => {
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.SUPPLIER_CREDIT_NOTE;
      dto.branchId = '123e4567-e89b-12d3-a456-426614174000';
      dto.userId = '123e4567-e89b-12d3-a456-426614174000';
      dto.supplierId = '123e4567-e89b-12d3-a456-426614174001';
      dto.subtotal = 50;
      dto.total = 50;
      dto.metadata = {
        links: { purchaseReturnId: '123e4567-e89b-12d3-a456-426614174099' },
      };
      dto.lines = [
        plainLine({ productName: 'NC', quantity: 1, unitPrice: 50, subtotal: 50, total: 50 }),
      ];

      const errors = dto.validate();

      expect(errors.filter((e) => e.includes('purchaseReturnId'))).toHaveLength(0);
    });
  });
});

function plainLine(p: {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  total: number;
}): CreateTransactionLineDto {
  const line = new CreateTransactionLineDto();
  line.productName = p.productName;
  line.quantity = p.quantity;
  line.unitPrice = p.unitPrice;
  line.subtotal = p.subtotal;
  line.total = p.total;
  line.discountPercentage = 0;
  line.discountAmount = 0;
  line.taxRate = 0;
  line.taxAmount = 0;
  return line;
}
