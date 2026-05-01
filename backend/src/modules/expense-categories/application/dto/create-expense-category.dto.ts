import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  MaxLength,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ExpenseCategoryOperationalGroup } from '../../domain/expense-category-operational-group.enum';

export class CreateExpenseCategoryDto {
  @IsNotEmpty()
  @IsUUID()
  companyId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsNotEmpty()
  @IsEnum(ExpenseCategoryOperationalGroup)
  operationalExpenseGroup!: ExpenseCategoryOperationalGroup;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsNumber()
  approvalThreshold?: number;

  @IsOptional()
  @IsUUID()
  defaultResultCenterId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  examples?: string[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
