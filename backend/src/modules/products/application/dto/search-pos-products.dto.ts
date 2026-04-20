import { IsString, IsOptional, IsUUID, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchPosProductsDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsUUID()
  @IsOptional()
  priceListId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 1))
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => (value ? parseInt(value, 10) : 20))
  @IsOptional()
  pageSize?: number = 20;
}
