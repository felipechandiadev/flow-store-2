import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaleLineDto {
  @IsString()
  productVariantId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  unitCost?: number;
}

/**
 * Datos específicos de un cheque que acompañan a un `PaymentDetailDto`
 * cuando `paymentMethod === 'CHECK'`. Permite materializar un registro
 * `Check` independiente del ciclo de vida de la transacción.
 */
export class CheckPaymentDataDto {
  @IsString()
  checkNumber: string;

  @IsString()
  bankName: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string | null;

  @IsOptional()
  @IsString()
  drawerName?: string | null;

  @IsOptional()
  @IsString()
  drawerDocument?: string | null;

  @IsOptional()
  @IsString()
  payeeName?: string | null;

  @IsOptional()
  @IsString()
  payeeId?: string | null;

  @IsOptional()
  @IsString()
  issueDate?: string | null;

  @IsOptional()
  @IsString()
  dueDate?: string | null;
}

export class PaymentDetailDto {
  @IsString()
  paymentMethod: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  /**
   * Id estable del medio de pago configurado a nivel empresa
   * (`companies.settings.paymentMethods[].id`). Se usa para hidratar
   * el snapshot del medio en `transactions.metadata.paymentSnapshot(s)`.
   */
  @IsOptional()
  @IsString()
  companyPaymentMethodId?: string;

  /** Referencia opcional (n.º operación, autorización, etc.). */
  @IsOptional()
  @IsString()
  reference?: string;

  /**
   * Datos del cheque cuando `paymentMethod === 'CHECK'`. Se persiste en
   * `metadata.paymentSnapshots[].checkData` y se usa para crear un
   * `Check INCOMING` ligado a la transacción.
   */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CheckPaymentDataDto)
  checkData?: CheckPaymentDataDto;
}

export class CreateSaleDto {
  @IsString()
  userName: string;

  @IsString()
  pointOfSaleId: string;

  @IsString()
  cashSessionId: string;

  @IsString()
  paymentMethod: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines: SaleLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDetailDto)
  payments?: PaymentDetailDto[];

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  storageId?: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string;

  @IsOptional()
  metadata?: any;
}
