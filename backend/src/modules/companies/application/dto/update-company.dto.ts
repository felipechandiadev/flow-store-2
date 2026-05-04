import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreFantasia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessActivity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  rut?: string;
}
