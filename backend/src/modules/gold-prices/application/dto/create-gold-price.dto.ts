import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateGoldPriceDto {
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
