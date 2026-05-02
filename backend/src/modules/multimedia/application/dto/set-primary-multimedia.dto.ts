import { IsUUID } from 'class-validator';

export class SetPrimaryMultimediaDto {
  @IsUUID()
  assetId!: string;
}
