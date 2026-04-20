import {
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { CreateSupplierDto } from './create-supplier.dto';
import { SupplierType } from '../../domain/supplier.entity';

export class UpdateSupplierDto implements Partial<CreateSupplierDto> {
  @IsOptional()
  @IsUUID()
  personId?: string;

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
