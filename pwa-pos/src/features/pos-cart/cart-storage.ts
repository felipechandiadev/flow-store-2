import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { ResolvedLineDiscount } from "@/features/promotions/lib/discount-engine.types";

const CART_STORAGE_VERSION = 1;
const CART_KEY_PREFIX = "flowstore.pos.cart.v";

/** Metadatos de una cotización cargada en el carrito. La venta resultante
 * de pagar el carrito se considerará una *conversión* de esa cotización
 * en lugar de una venta nueva (precios respetados desde el snapshot). */
export type LoadedQuotationMeta = {
  id: string;
  documentNumber: string;
  validUntil: string;
  expired: boolean;
};

type StoredCart = {
  v: number;
  updatedAt: string;
  lines: Array<{
    variantId: string;
    quantity: number;
    /** Descuento aplicado por el motor de promociones, persistido para
     * sobrevivir refresh y re-cálculo idempotente al cargar. */
    discount?: ResolvedLineDiscount | null;
    item: Omit<PosCartLine, "quantity" | "discount">;
  }>;
  customer?: PosSaleCustomer | null;
  quotation?: LoadedQuotationMeta | null;
};

function parseDiscount(value: unknown): ResolvedLineDiscount | null {
  if (!value || typeof value !== "object") return null;
  const d = value as Partial<ResolvedLineDiscount>;
  if (
    typeof d.promotionId !== "string" ||
    typeof d.promotionCode !== "string" ||
    typeof d.discountAmount !== "number"
  ) {
    return null;
  }
  return {
    promotionId: d.promotionId,
    promotionCode: d.promotionCode,
    promotionName: typeof d.promotionName === "string" ? d.promotionName : "",
    discountPercentage:
      typeof d.discountPercentage === "number" ? d.discountPercentage : 0,
    discountAmount: d.discountAmount,
    appliedQuantity:
      typeof d.appliedQuantity === "number" ? d.appliedQuantity : 0,
    overridesUnitPrice: !!d.overridesUnitPrice,
    newUnitPrice:
      typeof d.newUnitPrice === "number" ? d.newUnitPrice : undefined,
  };
}

function keyFor(input: { pointOfSaleId: string; priceListId: string }) {
  return `${CART_KEY_PREFIX}${CART_STORAGE_VERSION}.${input.pointOfSaleId}.${input.priceListId}`;
}

export function readCartClient(input: { pointOfSaleId: string; priceListId: string }): {
  lines: PosCartLine[];
  customer: PosSaleCustomer | null;
  quotation: LoadedQuotationMeta | null;
} {
  if (typeof window === "undefined")
    return { lines: [], customer: null, quotation: null };
  try {
    const raw = window.localStorage.getItem(keyFor(input));
    if (!raw) return { lines: [], customer: null, quotation: null };
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed || parsed.v !== CART_STORAGE_VERSION || !Array.isArray(parsed.lines)) {
      return { lines: [], customer: null, quotation: null };
    }
    const lines = parsed.lines
      .map((l) => {
        if (!l?.item || !l.variantId) return null;
        const qty = Number(l.quantity) || 0;
        if (qty <= 0) return null;
        const discount = parseDiscount((l as { discount?: unknown }).discount);
        return {
          ...(l.item as any),
          quantity: qty,
          discount,
        } as PosCartLine;
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
            email:
              (c as PosSaleCustomer).email != null && String((c as PosSaleCustomer).email).trim() !== ""
                ? String((c as PosSaleCustomer).email)
                : null,
          }
        : null;

    const q = parsed.quotation;
    const quotation: LoadedQuotationMeta | null =
      q &&
      typeof q === "object" &&
      typeof (q as LoadedQuotationMeta).id === "string" &&
      typeof (q as LoadedQuotationMeta).documentNumber === "string"
        ? {
            id: String((q as LoadedQuotationMeta).id),
            documentNumber: String((q as LoadedQuotationMeta).documentNumber),
            validUntil: String((q as LoadedQuotationMeta).validUntil ?? ""),
            expired: !!(q as LoadedQuotationMeta).expired,
          }
        : null;

    return { lines, customer, quotation };
  } catch {
    return { lines: [], customer: null, quotation: null };
  }
}

export function writeCartClient(
  input: { pointOfSaleId: string; priceListId: string },
  lines: PosCartLine[],
  customer: PosSaleCustomer | null = null,
  quotation: LoadedQuotationMeta | null = null,
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredCart = {
      v: CART_STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      lines: lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        discount: l.discount ?? null,
        item: (({ quantity, discount, ...rest }) => rest)(l),
      })),
      customer: customer ?? null,
      quotation: quotation ?? null,
    };
    window.localStorage.setItem(keyFor(input), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

