"use client";

import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import { InlineSepDot, PosProductNameWithAttributes } from "@/features/pos-products/ui/posProductPreview";

export type PosCartLine = PosProductSearchItem & { quantity: number };

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export default function PosCartLineCard({
  line,
  onIncrement,
  onDecrement,
}: {
  line: PosCartLine;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const code = line.barcode?.trim() || line.sku?.trim() || "—";
  const stockLabel =
    line.trackInventory && line.availableStock != null ? String(line.availableStock) : "—";

  return (
    <article
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      data-test-id="pos-cart-line"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 text-sm">
          <PosProductNameWithAttributes
            name={line.productName}
            attributes={line.attributes}
            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-0 text-zinc-700 dark:text-zinc-300">
            <span className="font-mono text-xs">{line.sku ?? "—"}</span>
            <InlineSepDot />
            <span className="text-xs">{code}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-0 text-zinc-800 dark:text-zinc-200">
            <span className="font-medium">{formatMoney(line.unitPriceWithTax)}</span>
            {line.unitSymbol ? <span className="text-xs text-zinc-500"> / {line.unitSymbol}</span> : null}
            <InlineSepDot />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Stock sucursal: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{stockLabel}</span>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-1 py-0.5 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              className="rounded px-2 py-1 text-lg leading-none text-zinc-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-800"
              onClick={onDecrement}
              aria-label="Disminuir cantidad"
            >
              −
            </button>
            <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
            <button
              type="button"
              className="rounded px-2 py-1 text-lg leading-none text-zinc-700 hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-800"
              onClick={onIncrement}
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
