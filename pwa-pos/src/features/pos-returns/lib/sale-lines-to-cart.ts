import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleForReturn } from "../types/pos-sale-for-return.types";

/**
 * Convierte líneas de una venta completada a `PosCartLine` para devolución.
 * Snapshot mínimo (sin imagen/stock), igual que cotización cargada.
 */
export function saleLinesToCart(sale: PosSaleForReturn): PosCartLine[] {
  return sale.lines.flatMap((l) => {
      const qty = Number(l.quantity) || 0;
      if (qty <= 0) return [];
      const variantId = l.productVariantId ?? l.productId ?? l.id;
      const unitPrice = Number(l.unitPrice) || 0;
      const taxRate = Number(l.taxRate) || 0;
      const taxAmount = Number(l.taxAmount) || 0;
      const lineTotal = Number(l.total) || 0;
      const unitTaxAmount = qty > 0 ? taxAmount / qty : 0;
      const unitPriceWithTax = qty > 0 ? lineTotal / qty : unitPrice + unitTaxAmount;
      const displayName = l.variantName?.trim()
        ? `${l.productName} — ${l.variantName}`
        : l.productName;

      const line: PosCartLine = {
        productId: l.productId ?? "",
        productName: displayName,
        productDescription: null,
        productImageUrl: null,
        variantId,
        sku: l.productSku ?? null,
        barcode: null,
        unitAllowDecimals: false,
        unitSymbol: l.unitOfMeasure ?? null,
        unitId: null,
        unitPrice,
        unitTaxRate: taxRate,
        unitTaxAmount,
        unitPriceWithTax,
        trackInventory: false,
        availableStock: null,
        availableStockBase: null,
        attributes: [],
        metadata: { sourceSaleLineId: l.id },
        quantity: qty,
      };
      return [line];
  });
}
