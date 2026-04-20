import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class SearchCustomersDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;
}
