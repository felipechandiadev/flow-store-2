import { BadRequestException } from '@nestjs/common';
import type { EShopStockPolicy } from '@modules/companies/domain/company-eshop-flat.types';

export interface StockCheckLine {
  variantId: string;
  requestedQty: number;
  availableQty: number;
  trackInventory: boolean;
}

export interface StockPolicyResult {
  hasShortage: boolean;
  shortages: StockCheckLine[];
}

export function evaluateStockPolicy(
  policy: EShopStockPolicy,
  lines: StockCheckLine[],
): StockPolicyResult {
  const shortages = lines.filter(
    (l) => l.trackInventory && l.requestedQty > l.availableQty,
  );
  const hasShortage = shortages.length > 0;

  if (policy === 'IGNORE_STOCK') {
    return { hasShortage, shortages };
  }

  if (policy === 'BLOCK_OUT_OF_STOCK' && hasShortage) {
    const detail = shortages
      .map((s) => `${s.variantId}: solicitado ${s.requestedQty}, disponible ${s.availableQty}`)
      .join('; ');
    throw new BadRequestException(
      `Stock insuficiente para completar el pedido (${detail})`,
    );
  }

  return { hasShortage, shortages };
}

export function shouldCreateBackorder(
  policy: EShopStockPolicy,
  hasShortage: boolean,
): boolean {
  return policy === 'ALLOW_BACKORDER' && hasShortage;
}
