import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(255)
  razonSocial!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreFantasia?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessActivity?: string | null;

  @IsString()
  @MaxLength(14)
  rut!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultCurrency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;
}
