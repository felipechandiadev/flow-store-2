import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { SupplierType } from '../../domain/supplier.entity';

export class CreateSupplierDto {
  @IsNotEmpty()
  @IsUUID()
  personId!: string;

  @IsOptional()
  @IsEnum(SupplierType)
  supplierType?: SupplierType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  alias?: string;

  @IsOptional()
  @IsNumber()
  defaultPaymentTermDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
