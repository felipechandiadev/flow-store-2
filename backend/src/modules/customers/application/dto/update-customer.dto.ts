import {
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  Max,
  IsIn,
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
}
