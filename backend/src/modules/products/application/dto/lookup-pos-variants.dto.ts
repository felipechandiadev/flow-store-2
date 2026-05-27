import { IsOptional, IsString, IsUUID } from 'class-validator';

export class LookupPosVariantsDto {
  /** IDs de variante separados por coma. */
  @IsString()
  variantIds: string;

  @IsUUID()
  @IsOptional()
  pointOfSaleId?: string;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
