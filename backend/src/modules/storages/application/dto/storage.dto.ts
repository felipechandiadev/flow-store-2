import {
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class StorageDto {
  id: string;
  branchId?: string;
  name: string;
  code?: string;
  type: StorageType;
  category: StorageCategory;
  capacity?: number;
  location?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  // Relations
  branch?: {
    id: string;
    name: string;
  };
}

export class CreateStorageDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType = StorageType.WAREHOUSE;

  @IsOptional()
  @IsEnum(StorageCategory)
  category?: StorageCategory = StorageCategory.IN_BRANCH;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateStorageDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(StorageType)
  type?: StorageType;

  @IsOptional()
  @IsEnum(StorageCategory)
  category?: StorageCategory;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
