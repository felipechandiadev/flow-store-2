import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import type { PayrollSettlementPaymentMode } from '../payroll-settlement-payment.util';

export class PayrollLineDto {
  @IsString()
  typeId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class PlannedPaymentLineDto {
  @IsDateString()
  dueDate!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class SettlementPaymentLineDto {
  @IsDateString()
  dueDate!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  companyBankAccountKey?: string | null;

  @IsOptional()
  @IsString()
  employeeBankAccountKey?: string | null;

  @IsOptional()
  @IsString()
  supplierBankAccountKey?: string | null;

  @IsOptional()
  @IsString()
  chequeNumber?: string | null;

  @IsOptional()
  @IsString()
  cashHubId?: string | null;
}

export class SettlementPaymentDto {
  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(['PENDING', 'PENDING_SCHEDULED', 'PARTIAL', 'COMPLETED'])
  mode!: PayrollSettlementPaymentMode;

  @IsOptional()
  @IsNumber()
  partialPaidAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementPaymentLineDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  paidLines?: SettlementPaymentLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementPaymentLineDto)
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  scheduledLines?: SettlementPaymentLineDto[];
}

export class CreateRemunerationDto {
  @IsUUID()
  employeeId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  resultCenterId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PayrollLineDto)
  lines!: PayrollLineDto[];

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlannedPaymentLineDto)
  plannedPayments?: PlannedPaymentLineDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SettlementPaymentDto)
  settlementPayment?: SettlementPaymentDto;
}

export class UpdateRemunerationDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID()
  resultCenterId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PayrollLineDto)
  lines?: PayrollLineDto[];
}
