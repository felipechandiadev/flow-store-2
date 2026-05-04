/**
 * CREATE TRANSACTION DTO - Base Coherente
 *
 * Este DTO es la ÚNICA forma de crear transacciones en el sistema.
 * Todos los servicios deben convertir sus payloads a este DTO y luego
 * llamar a TransactionsService.createTransaction(dto)
 */

import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  IsObject,
  IsDateString,
} from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';

/**
 * Línea de transacción (para SALE, PURCHASE, etc)
 */
export class CreateTransactionLineDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  productSku?: string;

  @IsOptional()
  @IsString()
  variantName?: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsNumber()
  @Min(0)
  discountPercentage: number = 0;

  @IsNumber()
  @Min(0)
  discountAmount: number = 0;

  @IsOptional()
  @IsUUID()
  taxId?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate: number = 0;

  @IsNumber()
  @Min(0)
  taxAmount: number = 0;

  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  @Min(0)
  total!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO Principal - Crear Transacción Genérica
 *
 * Este DTO cubre TODOS los tipos de transacción.
 * Ciertos campos son requeridos según el transactionType.
 */
import { validateSync } from 'class-validator';

export class CreateTransactionDto {
  // ==========================================
  // CAMPOS REQUERIDOS SIEMPRE
  // ==========================================

  @IsEnum(TransactionType)
  transactionType!: TransactionType;

  /** Si se omite en creación → CONFIRMED en el use case. Solo PURCHASE_ORDER admite DRAFT de forma segura desde pedidos OC. */
  @IsOptional()
  @IsEnum(TransactionStatus)
  transactionStatus?: TransactionStatus;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  userId!: string;

  // ==========================================
  // MONTOS
  // ==========================================

  @IsNumber()
  @Min(0)
  subtotal: number = 0;

  @IsNumber()
  @Min(0)
  taxAmount: number = 0;

  @IsNumber()
  @Min(0)
  discountAmount: number = 0;

  @IsNumber()
  @Min(0)
  total!: number;

  // ==========================================
  // MÉTODOS DE PAGO Y ESTADO
  // ==========================================

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod = PaymentMethod.CASH;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsNumber()
  @Min(0)
  amountPaid: number = 0;

  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  // ==========================================
  // RELACIONES POR TIPO DE TRANSACCIÓN
  // ==========================================

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  shareholderId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  pointOfSaleId?: string;

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsUUID()
  storageId?: string;

  @IsOptional()
  @IsUUID()
  targetStorageId?: string;

  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string;

  @IsOptional()
  @IsUUID()
  resultCenterId?: string;

  @IsOptional()
  @IsUUID()
  accountingPeriodId?: string;

  // ==========================================
  // REFERENCIAS Y DOCUMENTACIÓN
  // ==========================================

  @IsOptional()
  @IsString()
  documentType?: string; // 'Factura', 'Boleta', 'Guía', etc.

  @IsOptional()
  @IsString()
  documentFolio?: string; // Número externo del documento

  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @IsOptional()
  @IsUUID()
  relatedTransactionId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // ==========================================
  // LÍNEAS (Para SALE, PURCHASE, etc)
  // ==========================================

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionLineDto)
  @ArrayMinSize(0)
  lines?: CreateTransactionLineDto[] = [];

  // ==========================================
  // METADATOS PARA REGLAS CONTABLES
  // ==========================================

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // ==========================================
  // VALIDACIONES ADICIONALES
  // ==========================================

  /**
   * Validaciones custom: según transactionType, ciertos campos son requeridos
   */
  validate(): string[] {
    const errors: string[] = [];

    // DEPRECATION: Rechazar nuevos PAYMENT_OUT
    if (this.transactionType === TransactionType.PAYMENT_OUT) {
      errors.push(
        'PAYMENT_OUT está deprecado. Use SUPPLIER_PAYMENT o EXPENSE_PAYMENT según corresponda.',
      );
    }

    // Nested líneas deben ser instancias DTO; si no, validateSync falla con
    // "an unknown value was passed to the validate function" (objetos planos).
    if (this.lines?.length) {
      this.lines = this.lines.map((line) =>
        plainToInstance(CreateTransactionLineDto, line as object, {
          enableImplicitConversion: true,
        }),
      );
    }

    // run class-validator sync validation first
    const syncErrors = validateSync(this, { skipMissingProperties: false });
    if (syncErrors && syncErrors.length > 0) {
      const extract = (err: any) => {
        if (err.constraints) {
          errors.push(...Object.values(err.constraints).map(c => String(c)));
        }
        if (err.children && err.children.length) {
          err.children.forEach(extract);
        }
      };
      syncErrors.forEach(extract);
    }

    // algunos tipos necesitan monto positivo
    const poDraft =
      this.transactionType === TransactionType.PURCHASE_ORDER &&
      this.transactionStatus === TransactionStatus.DRAFT;

    const requirePositive = [
      TransactionType.SALE,
      TransactionType.PURCHASE,
      TransactionType.PURCHASE_ORDER,
      TransactionType.PURCHASE_RETURN,
      TransactionType.SUPPLIER_CREDIT_NOTE,
      TransactionType.SUPPLIER_PAYMENT,
      TransactionType.EXPENSE_PAYMENT,
      TransactionType.CASH_DEPOSIT,
      TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER,
      TransactionType.PAYMENT_IN,
      TransactionType.PAYMENT_OUT,
      TransactionType.PAYROLL,
      TransactionType.PAYMENT_EXECUTION,
    ];
    if (requirePositive.includes(this.transactionType) && !poDraft) {
      if (this.subtotal < 0.01) {
        errors.push('subtotal debe ser mayor a 0');
      }
      if (this.total < 0.01) {
        errors.push('total debe ser mayor a 0');
      }
    }

    switch (this.transactionType) {
      case TransactionType.PAYMENT_IN:
        if (
          this.metadata?.capitalContribution &&
          !this.shareholderId &&
          !this.bankAccountKey
        ) {
          errors.push(
            'capitalContribution requiere shareholderId o bankAccountKey',
          );
        }
        break;

      case TransactionType.PAYMENT_OUT:
        if (this.metadata?.bankToCashTransfer && !this.bankAccountKey) {
          errors.push('bankToCashTransfer requiere bankAccountKey');
        }
        if (this.supplierId && !this.total) {
          errors.push('Pago a proveedor requiere monto');
        }
        break;

      case TransactionType.PAYMENT_EXECUTION:
        if (!this.relatedTransactionId) {
          errors.push(
            'PAYMENT_EXECUTION requiere relatedTransactionId (PAYMENT_OUT)',
          );
        }
        if (!this.total) {
          errors.push('PAYMENT_EXECUTION requiere monto');
        }
        if (!this.paymentMethod) {
          errors.push('PAYMENT_EXECUTION requiere paymentMethod');
        }
        break;

      case TransactionType.SUPPLIER_PAYMENT:
        if (!this.supplierId) {
          errors.push('SUPPLIER_PAYMENT requiere supplierId');
        }
        if (!this.relatedTransactionId) {
          errors.push(
            'SUPPLIER_PAYMENT requiere relatedTransactionId (PURCHASE)',
          );
        }
        if (!this.total) {
          errors.push('SUPPLIER_PAYMENT requiere monto');
        }
        if (!this.paymentMethod) {
          errors.push('SUPPLIER_PAYMENT requiere paymentMethod');
        }
        break;

      case TransactionType.EXPENSE_PAYMENT:
        if (!this.expenseCategoryId) {
          errors.push('EXPENSE_PAYMENT requiere expenseCategoryId');
        }
        if (!this.total) {
          errors.push('EXPENSE_PAYMENT requiere monto');
        }
        if (!this.paymentMethod) {
          errors.push('EXPENSE_PAYMENT requiere paymentMethod');
        }
        break;

      case TransactionType.CASH_DEPOSIT:
        if (!this.bankAccountKey) {
          errors.push('CASH_DEPOSIT requiere bankAccountKey');
        }
        break;

      case TransactionType.CASH_SESSION_OPENING:
        if (!this.pointOfSaleId) {
          errors.push('CASH_SESSION_OPENING requiere pointOfSaleId');
        }
        break;

      case TransactionType.SALE:
        if (!this.customerId && !this.pointOfSaleId) {
          errors.push('SALE requiere customerId o pointOfSaleId');
        }
        if (this.lines && this.lines.length === 0) {
          errors.push('SALE requiere al menos una línea');
        }
        break;

      case TransactionType.PURCHASE:
        if (!this.supplierId) {
          errors.push('PURCHASE requiere supplierId');
        }
        if (this.lines && this.lines.length === 0) {
          errors.push('PURCHASE requiere al menos una línea');
        }
        break;

      case TransactionType.PURCHASE_ORDER:
        if (!poDraft) {
          if (!this.supplierId) {
            errors.push('PURCHASE_ORDER requiere supplierId');
          }
          if (!this.lines || this.lines.length === 0) {
            errors.push('PURCHASE_ORDER requiere al menos una línea');
          }
        }
        break;

      case TransactionType.OPERATING_EXPENSE:
        if (!this.expenseCategoryId) {
          errors.push('OPERATING_EXPENSE requiere expenseCategoryId');
        }
        break;

      case TransactionType.PURCHASE_RETURN:
        if (!this.supplierId) {
          errors.push('PURCHASE_RETURN requiere supplierId');
        }
        if (!this.storageId) {
          errors.push('PURCHASE_RETURN requiere storageId');
        }
        if (!this.lines || this.lines.length === 0) {
          errors.push('PURCHASE_RETURN requiere al menos una línea');
        }
        break;

      case TransactionType.SUPPLIER_CREDIT_NOTE: {
        if (!this.supplierId) {
          errors.push('SUPPLIER_CREDIT_NOTE requiere supplierId');
        }
        const prId = this.metadata?.links?.purchaseReturnId;
        const uuidRe =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!prId || typeof prId !== 'string' || !uuidRe.test(String(prId).trim())) {
          errors.push(
            'SUPPLIER_CREDIT_NOTE requiere metadata.links.purchaseReturnId (UUID de PURCHASE_RETURN)',
          );
        }
        if (!this.lines || this.lines.length === 0) {
          errors.push('SUPPLIER_CREDIT_NOTE requiere al menos una línea');
        }
        break;
      }

      // ... más validaciones según tipo...
    }

    // Validación: Si hay líneas, total debe ser suma de líneas
    if (this.lines && this.lines.length > 0) {
      const linesTotal = this.lines.reduce((sum, line) => sum + line.total, 0);
      if (Math.abs(linesTotal - this.total) > 0.01) {
        errors.push(
          `Total de líneas (${linesTotal}) no coincide con total (${this.total})`,
        );
      }
    }

    return errors;
  }
}

/**
 * DTO para operaciones específicas (legacy, en transición)
 * Estos DTOs específicos deben convertirse a CreateTransactionDto antes de usar
 */

export class CreateCapitalContributionDto {
  shareholderId!: string;
  bankAccountKey!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.PAYMENT_IN;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.shareholderId = this.shareholderId;
    dto.bankAccountKey = this.bankAccountKey;
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      capitalContribution: true,
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}

export class CreateCashDepositDto {
  bankAccountKey!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.CASH_DEPOSIT;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.bankAccountKey = this.bankAccountKey;
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.CASH;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      cashDeposit: true,
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}

export class CreateBankTransferDto {
  bankAccountKey!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.PAYMENT_OUT;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.bankAccountKey = this.bankAccountKey;
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      bankToCashTransfer: true,
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}

export class CreateBankWithdrawalToShareholderDto {
  shareholderId!: string;
  bankAccountKey!: string;
  amount!: number;
  notes?: string;
  occurredOn?: string;

  toCreateTransactionDto(
    userId: string,
    branchId: string,
  ): CreateTransactionDto {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER;
    dto.branchId = branchId;
    dto.userId = userId;
    dto.shareholderId = this.shareholderId;
    dto.bankAccountKey = this.bankAccountKey;
    dto.subtotal = this.amount;
    dto.taxAmount = 0;
    dto.discountAmount = 0;
    dto.total = this.amount;
    dto.paymentMethod = PaymentMethod.TRANSFER;
    dto.amountPaid = this.amount;
    dto.notes = this.notes;
    dto.metadata = {
      bankWithdrawalToShareholder: true,
      occurredOn: this.occurredOn,
    };
    return dto;
  }
}
