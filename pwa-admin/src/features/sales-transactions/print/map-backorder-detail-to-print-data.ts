import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  SALES_PAYMENT_METHOD_LABEL,
  type SalesPaymentMethod,
} from "@/features/sales-payments/types/sales-payment.types";
import { formatSalePaymentMethodDisplay } from "../lib/format-sale-payment-method";
import type { SaleTransactionDetail } from "../types/sale-transaction-detail.types";
import type { BackorderDocumentPrintData } from "./backorder-document-print.types";

export function mapBackorderDetailToPrintData(
  detail: SaleTransactionDetail,
  company: CompanyDetails | null,
): BackorderDocumentPrintData {
  const deposit = detail.backorderDepositAmount ?? detail.amountPaid;
  const orderTotal = detail.total;
  const paymentRows =
    detail.payments.length > 0
      ? detail.payments.map((p) => {
          const key = p.method as SalesPaymentMethod;
          const label =
            p.alias?.trim() ||
            SALES_PAYMENT_METHOD_LABEL[key] ||
            p.method;
          return { label, amount: p.amount, detail: p.reference };
        })
      : [
          {
            label: formatSalePaymentMethodDisplay(detail.paymentMethod, 0),
            amount: deposit,
            detail: null as string | null,
          },
        ];

  return {
    folio: detail.documentNumber.trim() || "—",
    issuedAtIso: detail.createdAt,
    documentKind: "backorder",
    backorder: {
      depositAmount: deposit,
      orderTotal,
      percent: detail.backorderDepositPercent ?? 0,
    },
    company: {
      razonSocial: company?.razonSocial?.trim() ?? "",
      nombreFantasia: company?.nombreFantasia?.trim() ?? null,
      rut: company?.rut?.trim() ?? null,
      businessActivity: company?.businessActivity?.trim() ?? null,
      logoUrl: null,
      address: company?.address?.trim() ?? null,
      mail: company?.mail?.trim() ?? null,
    },
    pos: {
      pointOfSaleName: detail.pointOfSaleName,
      branchName: detail.branchName,
      priceListLabel: null,
    },
    customer: detail.customerLabel?.trim()
      ? {
          name: detail.customerLabel.trim(),
          document: detail.customerDocument?.trim() ?? null,
        }
      : null,
    lines: detail.lines.map((line) => ({
      productName: line.productName,
      attributes: line.variantName?.trim() ? [line.variantName.trim()] : [],
      quantity: line.quantity,
      unitPriceWithTax: line.unitPrice,
      lineGross: line.total,
    })),
    promotions: [],
    totals: {
      subtotalNet: detail.subtotal,
      subtotalGross: orderTotal,
      taxes: detail.taxAmount,
      lineDiscounts: detail.discountAmount,
      orderDiscount: 0,
      discountsTotal: detail.discountAmount,
      total: orderTotal,
      paid: deposit,
      change: detail.changeAmount ?? 0,
    },
    payments: paymentRows,
  };
}
