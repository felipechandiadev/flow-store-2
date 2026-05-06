/** Vista compacta de producto/variante (misma idea que `PurchaseDocumentProductPreview` en pwa-admin). */

import type { PosProductAttribute } from "@/features/pos-products/types/pos-product.types";

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
