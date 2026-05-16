import {
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  IsIn,
  MaxLength,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsIn([5, 10, 15, 20, 25, 30])
  paymentDayOfMonth?: 5 | 10 | 15 | 20 | 25 | 30;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessName?: string;

  @IsOptional()
  @IsIn(['RUN', 'RUT', 'PASSPORT', 'DNI'])
  documentType?: 'RUN' | 'RUT' | 'PASSPORT' | 'DNI';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
