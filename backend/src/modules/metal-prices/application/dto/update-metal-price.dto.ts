import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class UpdateMetalPriceDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber()
  valueCLP?: number;

  @IsOptional()
  @IsString()
  metal?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
