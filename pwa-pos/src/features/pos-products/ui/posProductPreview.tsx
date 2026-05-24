/** Vista compacta de producto/variante (misma idea que `PurchaseDocumentProductPreview` en pwa-admin). */

import type {
  PosProductAttribute,
  PosProductSearchItem,
} from "@/features/pos-products/types/pos-product.types";

type PosStockFields = Pick<
  PosProductSearchItem,
  | "trackInventory"
  | "availableStock"
  | "availableStockBase"
  | "stockBaseQtyPerCountSaleUnit"
  | "unitAllowDecimals"
>;

/** Unidad mostrada en cards de búsqueda y carrito: siempre venta, nunca base de stock. */
export function posDisplaySaleUnitSymbol(
  item: Pick<PosProductSearchItem, "unitSymbol" | "stockBaseUnitSymbol" | "saleUnitSymbol">,
): string | null {
  const sale = item.saleUnitSymbol?.trim();
  if (sale) return sale;
  const sym = item.unitSymbol?.trim() || null;
  const base = item.stockBaseUnitSymbol?.trim();
  if (sym && base && sym === base) return null;
  return sym;
}

/** Cantidad de stock en unidades de venta (no en unidad base de inventario). */
export function posResolveAvailableStockInSaleUnits(item: PosStockFields): number | null {
  if (!item.trackInventory) return null;

  const base = item.availableStockBase;
  const bridgeRaw = item.stockBaseQtyPerCountSaleUnit;
  const bridge =
    bridgeRaw != null && bridgeRaw !== "" ? Number(bridgeRaw) : Number.NaN;
  const hasBridge = Number.isFinite(bridge) && bridge > 0;
  const sale = item.availableStock;

  if (hasBridge && base != null) {
    const fromBase = base / bridge;
    if (sale == null) return fromBase;
    if (Math.abs(sale - base) < 1e-9) return fromBase;
    return sale;
  }

  if (sale != null) return sale;
  return base;
}

function stockHasFraction(qty: number): boolean {
  return Math.abs(qty - Math.trunc(qty)) > 1e-9;
}

/** Cantidad de stock con coma decimal (es-CL) cuando aplica. */
function formatStockQuantityNumber(qty: number, allowDecimals: boolean): string {
  if (!allowDecimals && !stockHasFraction(qty)) {
    return String(Math.trunc(qty));
  }
  const formatted = new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
    useGrouping: false,
  }).format(qty);
  // Asegurar coma si el runtime usa punto (p. ej. en-US).
  return formatted.includes(".") && !formatted.includes(",")
    ? formatted.replace(".", ",")
    : formatted;
}

export function posFormatStockQuantity(item: PosStockFields): string | null {
  const qty = posResolveAvailableStockInSaleUnits(item);
  if (qty == null || !Number.isFinite(qty)) return null;
  const allowDecimals = item.unitAllowDecimals === true || stockHasFraction(qty);
  return formatStockQuantityNumber(qty, allowDecimals);
}

/** True si la cantidad del carrito supera el stock disponible (unidad de venta). */
export function posCartQuantityExceedsAvailableStock(
  line: PosStockFields & { quantity: number },
): boolean {
  if (!line.trackInventory) return false;
  const available = posResolveAvailableStockInSaleUnits(line);
  if (available == null || !Number.isFinite(available)) return false;
  const qty = Number(line.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return false;
  return qty > available + 1e-9;
}

/** Texto para la fila «Stock: …» en cards (cantidad en unidad de venta). */
export function posFormatStockForCard(
  item: PosStockFields & Pick<PosProductSearchItem, "unitSymbol" | "stockBaseUnitSymbol" | "saleUnitSymbol">,
): string {
  if (!item.trackInventory) return "—";
  const qty = posFormatStockQuantity(item);
  if (qty == null) return "—";
  const unit = posDisplaySaleUnitSymbol(item);
  return unit ? `${qty} ${unit}` : qty;
}

export function InlineSepDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-1.25 w-1.25 shrink-0 rounded-full bg-secondary align-middle"
    />
  );
}

export function formatMoney(amount: number): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(amount),
    );
  } catch {
    return String(Math.round(amount));
  }
}

function attributeParts(attrs: PosProductAttribute[] | null | undefined): string[] {
  if (!attrs?.length) return [];
  return attrs.map((a) => String(a.attributeValue ?? "").trim()).filter(Boolean);
}

export function PosProductNameWithAttributes({
  name,
  attributes,
  className = "",
}: {
  name: string;
  attributes: PosProductAttribute[] | null | undefined;
  className?: string;
}) {
  const parts = attributeParts(attributes);
  const label = [name, ...parts].join(" · ");
  return (
    <p className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`.trim()} title={label}>
      <span className="min-w-0">{name}</span>
      {parts.map((part, i) => (
        <span key={`${i}-${part}`} className="inline-flex min-w-0 items-center gap-x-1.5">
          <InlineSepDot />
          <span className="shrink-0">{part}</span>
        </span>
      ))}
    </p>
  );
}
