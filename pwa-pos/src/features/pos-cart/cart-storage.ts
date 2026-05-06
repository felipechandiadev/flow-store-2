import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

const CART_STORAGE_VERSION = 1;
const CART_KEY_PREFIX = "flowstore.pos.cart.v";

type StoredCart = {
  v: number;
  updatedAt: string;
  lines: Array<{
    variantId: string;
    quantity: number;
    item: Omit<PosCartLine, "quantity">;
  }>;
};

function keyFor(input: { pointOfSaleId: string; priceListId: string }) {
  return `${CART_KEY_PREFIX}${CART_STORAGE_VERSION}.${input.pointOfSaleId}.${input.priceListId}`;
}

export function readCartClient(input: { pointOfSaleId: string; priceListId: string }): PosCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(input));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed || parsed.v !== CART_STORAGE_VERSION || !Array.isArray(parsed.lines)) return [];
    return parsed.lines
      .map((l) => {
        if (!l?.item || !l.variantId) return null;
        const qty = Number(l.quantity) || 0;
        if (qty <= 0) return null;
        return { ...(l.item as any), quantity: qty } as PosCartLine;
      })
      .filter(Boolean) as PosCartLine[];
  } catch {
    return [];
  }
}

export function writeCartClient(
  input: { pointOfSaleId: string; priceListId: string },
  lines: PosCartLine[],
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredCart = {
      v: CART_STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      lines: lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        item: (({ quantity, ...rest }) => rest)(l),
      })),
    };
    window.localStorage.setItem(keyFor(input), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

