import { IsOptional, IsString } from 'class-validator';

export class UnlinkMultimediaDto {
  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  usageType?: string;
}