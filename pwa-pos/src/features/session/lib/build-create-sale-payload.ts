import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosPaymentLine } from "@/features/pos-cart/pos-payment.types";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { AppliedSnapshot } from "@/features/promotions/lib/discount-engine.types";

/** Cuerpo enviado a `POST /api/cash-sessions/sales` (CreateSaleDto). */
export type CreateSaleApiBody = {
  userName: string;
  pointOfSaleId: string;
  cashSessionId: string;
  paymentMethod: string;
  lines: Array<{
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
  }>;
  payments?: Array<{
    paymentMethod: string;
    amount: number;
    companyPaymentMethodId?: string;
    reference?: string;
    bankAccountId?: string;
    checkData?: {
      checkNumber: string;
      bankName: string;
      drawerName?: string | null;
      drawerDocument?: string | null;
      issueDate?: string | null;
      dueDate?: string | null;
    };
  }>;
  amountPaid?: number;
  changeAmount?: number;
  customerId?: string;
  promotionSnapshot?: Array<{
    promotionId: string;
    promotionCode: string;
    promotionName: string;
    type: string;
    activation: string;
    authorization: string;
    amountDiscounted: number;
    affectedLineIds: string[];
    isOrderLevel?: boolean;
    accountingTag?: string | null;
  }>;
};

export type CreateSaleClientPayload = Omit<CreateSaleApiBody, "userName">;

function dominantPaymentMethod(lines: PosPaymentLine[]): string {
  const used = lines.filter((p) => (Number(p.amount) || 0) > 0);
  if (used.length === 0) return "CASH";
  const sorted = [...used].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  return sorted[0].type;
}

export function buildCreateSaleLines(cartLines: PosCartLine[]) {
  return cartLines.map((l) => {
    const qty = Number(l.quantity) || 0;
    const unitNet = Number(l.unitPrice) || 0;
    const unitGross = Number(l.unitPriceWithTax) || 0;
    const taxAmount = Math.round(Math.max(0, unitGross - unitNet) * qty);
    const taxRate = Number(l.unitTaxRate);
    const discountAmount = l.discount?.discountAmount ? Math.round(l.discount.discountAmount) : 0;
    return {
      productVariantId: l.variantId,
      quantity: qty,
      unitPrice: unitNet,
      ...(discountAmount > 0 ? { discountAmount } : {}),
      taxRate: Number.isFinite(taxRate) && taxRate >= 0 ? taxRate : undefined,
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
    };
  });
}

type SalePaymentRow = NonNullable<CreateSaleApiBody["payments"]>[number];

export function buildCreateSalePayments(payments: PosPaymentLine[]): SalePaymentRow[] {
  return payments
    .filter((p) => (Number(p.amount) || 0) > 0)
    .map((p) => {
      const row: SalePaymentRow = {
        paymentMethod: p.type,
        amount: Math.round(Number(p.amount) || 0),
        companyPaymentMethodId: p.companyPaymentMethodId?.trim() || undefined,
        reference: p.reference?.trim() || undefined,
        bankAccountId: p.bankAccountKey?.trim() || undefined,
      };
      if (p.type === "CHECK" && p.checkData) {
        const cd = p.checkData;
        row.checkData = {
          checkNumber: cd.checkNumber?.trim() ?? "",
          bankName: cd.bankName?.trim() ?? "",
          drawerName: cd.drawerName?.trim() || undefined,
          drawerDocument: cd.drawerDocument?.trim() || undefined,
          issueDate: cd.issueDate?.trim() || undefined,
          dueDate: cd.dueDate?.trim() || undefined,
        };
      }
      return row;
    });
}

function buildPromotionSnapshot(applied: AppliedSnapshot[]): CreateSaleApiBody["promotionSnapshot"] {
  if (!applied.length) return undefined;
  return applied.map((ap) => ({
    promotionId: ap.promotionId,
    promotionCode: ap.promotionCode,
    promotionName: ap.promotionName,
    type: String(ap.type),
    activation: String(ap.activation),
    authorization: String(ap.authorization),
    amountDiscounted: Math.round(Number(ap.amountDiscounted) || 0),
    affectedLineIds: [...ap.affectedLineIds],
    isOrderLevel: ap.isOrderLevel === true,
    accountingTag: ap.accountingTag ?? undefined,
  }));
}

export function buildCreateSaleClientPayload(input: {
  pointOfSaleId: string;
  cashSessionId: string;
  cartLines: PosCartLine[];
  payments: PosPaymentLine[];
  customer: PosSaleCustomer | null;
  appliedPromotions: AppliedSnapshot[];
  appliedTotal: number;
  overpay: number;
}): CreateSaleClientPayload {
  const paymentLines = input.payments.filter((p) => (Number(p.amount) || 0) > 0);
  const promotionSnapshot = buildPromotionSnapshot(input.appliedPromotions);
  return {
    pointOfSaleId: input.pointOfSaleId.trim(),
    cashSessionId: input.cashSessionId.trim(),
    paymentMethod: dominantPaymentMethod(paymentLines),
    lines: buildCreateSaleLines(input.cartLines),
    payments: buildCreateSalePayments(input.payments),
    amountPaid: Math.round(input.appliedTotal),
    changeAmount: Math.round(Math.max(0, input.overpay)),
    customerId: input.customer?.customerId?.trim() || undefined,
    promotionSnapshot,
  };
}
