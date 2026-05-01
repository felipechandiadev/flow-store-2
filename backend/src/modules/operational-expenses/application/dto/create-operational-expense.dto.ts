import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsString,
  MaxLength,
  IsArray,
  IsObject,
  Validate,
} from 'class-validator';
import { OperationalExpenseStatus } from '../../domain/operational-expense.entity';
import { ForbidLegacyAttachmentsConstraint } from './forbid-legacy-attachments.constraint';

export class CreateOperationalExpenseDto {
  @IsNotEmpty()
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  resultCenterId?: string;

  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  operationDate!: string;

  @IsOptional()
  @IsEnum(OperationalExpenseStatus)
  status?: OperationalExpenseStatus;

  @IsOptional()
  @IsObject()
  @Validate(ForbidLegacyAttachmentsConstraint)
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  multimediaAssetIds?: string[];

  @IsNotEmpty()
  @IsUUID()
  createdBy!: string;
}
