import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";

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
  /** Cliente de la venta (misma sesión que el carrito). */
  customer?: PosSaleCustomer | null;
};

function keyFor(input: { pointOfSaleId: string; priceListId: string }) {
  return `${CART_KEY_PREFIX}${CART_STORAGE_VERSION}.${input.pointOfSaleId}.${input.priceListId}`;
}

export function readCartClient(input: { pointOfSaleId: string; priceListId: string }): {
  lines: PosCartLine[];
  customer: PosSaleCustomer | null;
} {
  if (typeof window === "undefined") return { lines: [], customer: null };
  try {
    const raw = window.localStorage.getItem(keyFor(input));
    if (!raw) return { lines: [], customer: null };
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed || parsed.v !== CART_STORAGE_VERSION || !Array.isArray(parsed.lines)) {
      return { lines: [], customer: null };
    }
    const lines = parsed.lines
      .map((l) => {
        if (!l?.item || !l.variantId) return null;
        const qty = Number(l.quantity) || 0;
        if (qty <= 0) return null;
        return { ...(l.item as any), quantity: qty } as PosCartLine;
      })
      .filter(Boolean) as PosCartLine[];

    const c = parsed.customer;
    const customer: PosSaleCustomer | null =
      c &&
      typeof c === "object" &&
      typeof (c as PosSaleCustomer).name === "string" &&
      typeof (c as PosSaleCustomer).document === "string" &&
      typeof (c as PosSaleCustomer).phone === "string"
        ? {
            customerId:
              (c as PosSaleCustomer).customerId != null && String((c as PosSaleCustomer).customerId).trim() !== ""
                ? String((c as PosSaleCustomer).customerId)
                : null,
            name: String((c as PosSaleCustomer).name),
            document: String((c as PosSaleCustomer).document),
            phone: String((c as PosSaleCustomer).phone),
          }
        : null;

    return { lines, customer };
  } catch {
    return { lines: [], customer: null };
  }
}

export function writeCartClient(
  input: { pointOfSaleId: string; priceListId: string },
  lines: PosCartLine[],
  customer: PosSaleCustomer | null = null,
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
      customer: customer ?? null,
    };
    window.localStorage.setItem(keyFor(input), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

