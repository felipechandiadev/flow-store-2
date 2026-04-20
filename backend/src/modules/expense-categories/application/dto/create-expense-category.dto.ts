import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  MaxLength,
  IsNumber,
} from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsNotEmpty()
  @IsUUID()
  companyId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupName?: string;

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
