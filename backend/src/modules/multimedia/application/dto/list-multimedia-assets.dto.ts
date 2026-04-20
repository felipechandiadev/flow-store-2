import { IsOptional, IsString } from 'class-validator';

export class ListMultimediaAssetsDto {
  @IsOptional()
  @IsString()
  usageType?: string;
}