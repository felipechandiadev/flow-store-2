import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateMetalPriceDto {
  @IsDateString()
  date: string;

  @IsNumber()
  valueCLP: number;

  @IsString()
  metal: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
