import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class CloseCashSessionUserDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

export class CloseCashSessionDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  closedById?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CloseCashSessionUserDto)
  user?: CloseCashSessionUserDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualCash?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Opcional: centro de acopio destino (debe estar vinculado al POS o ser default del POS). */
  @IsOptional()
  @IsUUID()
  cashHubId?: string;
}