import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class StockLevelDto {
  id: string;
  productVariantId: string;
  storageId: string;
  physicalStock: number;
  committedStock: number;
  availableStock: number;
  incomingStock: number;
  pmp: number | null;
  lastTransactionId: string | null;
  lastUpdated: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class CreateAdjustmentDto {
  @IsUUID()
  variantId: string;

  @IsUUID()
  storageId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentQuantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetQuantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateTransferDto {
  @IsUUID()
  variantId: string;

  @IsUUID()
  sourceStorageId: string;

  @IsUUID()
  targetStorageId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RecalculateValuationDto {
  variantId?: string;
  storageId?: string; // optional for bulk
}

export class StockLevelWithDetailsDto extends StockLevelDto {
  variantSku?: string;
  variantName?: string;
  productName?: string;
  storageName?: string;
  branchName?: string;
  unitOfMeasure?: string;
  minimumStock?: number;
  baseCost?: number;
  totalValue?: number | null; // physical * pmp; null sin PMP
  isBelowMinimum?: boolean;
}

export class SearchStockFiltersDto {
  search?: string;
  branchId?: string;
  storageId?: string;
  limit?: number;
  offset?: number;
}

export class StockFiltersDto {
  storages: any[];
  branches: any[];
  categories: any[];
  units: any[];
  attributes: any[];
}

export class StockMovementDto {
  transactionId: string;
  documentNumber: string;
  transactionType: string;
  createdAt: Date;
  quantity: number;
  notes?: string;
  storageName: string;
  targetStorageName?: string;
  direction: 'IN' | 'OUT';
}
