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
  });
});
