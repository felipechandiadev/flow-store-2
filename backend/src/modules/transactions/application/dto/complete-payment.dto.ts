import { IsObject, IsOptional, IsString } from 'class-validator';

export class CompletePaymentDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  bankAccountKey?: string;

  @IsOptional()
  @IsString()
  cashHubId?: string;

  @IsOptional()
  @IsObject()
  supplierBankAccount?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  companyBankAccount?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;
}