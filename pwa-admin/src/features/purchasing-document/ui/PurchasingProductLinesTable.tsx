"use client";

import type { ReceptionLineForReturn } from "@/features/receptions/types/reception.types";
import type { PurchasingTransactionDetailLine } from "../types/purchasing-detail.types";

export type PurchasingLineRow = {
  key: string;
  productName: string;
  sku?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function receptionLinesToRows(lines: ReceptionLineForReturn[]): PurchasingLineRow[] {
  return lines.map((l) => {
    const qty = Number(l.receivedQuantity ?? l.quantity) || 0;
    const unit = Number(l.unitPrice) || 0;
    return {
      key: l.id,
      productName: l.productName,
      sku: l.sku,
      variantName: l.variantName,
      quantity: qty,
      unitPrice: unit,
      lineTotal: qty * unit,
    };
  });
}

export function transactionLinesToRows(
  lines: PurchasingTransactionDetailLine[],
): PurchasingLineRow[] {
  return lines.map((l) => ({
    key: l.id,
    productName: l.productName,
    sku: l.productSku,
    variantName: l.variantName,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.subtotal > 0 ? l.subtotal : l.total,
  }));
}

type Props = {
  rows: PurchasingLineRow[];
  emptyMessage?: string;
};

export default function PurchasingProductLinesTable({
  rows,
  emptyMessage = "Sin líneas de producto.",
}: Props) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Producto</th>
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 text-right font-medium">Cant.</th>
            <th className="px-3 py-2 text-right font-medium">P. unit.</th>
            <th className="px-3 py-2 text-right font-medium">Total línea</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 text-foreground">
                <div className="font-medium">{row.productName}</div>
                {row.variantName ? (
                  <div className="text-xs text-muted-foreground">{row.variantName}</div>
                ) : null}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {row.sku || "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(row.unitPrice)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {formatMoney(row.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
