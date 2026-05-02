"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import IconButton from "@/shared/components/IconButton/IconButton";
import { TextField } from "@/shared/components/TextField/TextField";
import NumberStepper from "@/shared/components/NumberStepper/NumberStepper";
import { Select, type Option } from "@/shared/components/Select";
import AutoComplete from "@/shared/components/AutoComplete/AutoComplete";
import Switch from "@/shared/components/Switch/Switch";
import { Button } from "@/shared/components/Button";
import type { PurchasingVariantSearchItem, PurchasingVariantSearchResult } from "@/features/purchasing-document/types/purchasing-document.types";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";

/** Query en URL para búsqueda SSR de variantes. */
export const PURCHASE_DOC_URL_QUERY = "v";
/** Página de resultados (10 por página). */
export const PURCHASE_DOC_URL_PAGE = "vp";

export type PurchaseDocumentMode = "reception" | "purchase_order";

export type PurchaseDocumentLine = {
  key: string;
  variantId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  /** Valores de atributos de la variante (solo valores, sin nombre de atributo en UI). */
  attributeValues: Record<string, string>;
  quantity: number;
  unitPrice: number;
  taxIds: string[];
};

export type PurchaseDocumentBuilderProps = {
  mode: PurchaseDocumentMode;
  variantSearch: PurchasingVariantSearchResult;
  searchQuery: string;
  searchPage: number;
  suppliers: SupplierGridRow[];
  storages: StorageListItem[];
  taxes: TaxListItem[];
  /** Solo usable desde un padre cliente; si no se pasa, Guardar no hace persistencia. */
  onSave?: () => void | Promise<void>;
  isSaving?: boolean;
};

function supplierLabel(s: SupplierGridRow): string {
  const a = s.alias?.trim();
  if (a) {
    return a;
  }
  const p = s.person;
  if (!p) {
    return s.id;
  }
  if (p.type === "COMPANY" && p.businessName?.trim()) {
    return p.businessName.trim();
  }
  const parts = [p.firstName, p.lastName].filter(Boolean);
  const joined = parts.join(" ").trim();
  return joined || s.id;
}

function formatMoney(amount: number): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
      Math.round(amount),
    );
  } catch {
    return String(Math.round(amount));
  }
}

function attributeValueParts(av: Record<string, string>): string[] {
  return Object.values(av)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Mismo separador circular que entre nombre y atributos (secondary, ~5px). */
function InlineSepDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-[0.3125rem] w-[0.3125rem] shrink-0 rounded-full bg-secondary align-middle"
    />
  );
}

function ProductNameWithAttributes({
  name,
  attributeValues,
  className = "",
}: {
  name: string;
  attributeValues: Record<string, string>;
  className?: string;
}) {
  const parts = attributeValueParts(attributeValues);
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

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PurchaseDocumentBuilder({
  mode,
  variantSearch,
  searchQuery,
  searchPage,
  suppliers,
  storages,
  taxes,
  onSave,
  isSaving = false,
}: PurchaseDocumentBuilderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const activeTaxes = useMemo(() => taxes.filter((t) => t.isActive !== false), [taxes]);
  const activeStorages = useMemo(() => storages.filter((s) => s.isActive !== false), [storages]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);

  const supplierOptions: Option[] = useMemo(
    () => activeSuppliers.map((s) => ({ id: s.id, label: supplierLabel(s) })),
    [activeSuppliers],
  );
  const storageOptions: Option[] = useMemo(
    () => activeStorages.map((s) => ({ id: s.id, label: s.name })),
    [activeStorages],
  );

  const [draftSearch, setDraftSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Página desde la URL (se actualiza al navegar); el prop `searchPage` puede ir atrasado respecto a `router.replace`. */
  const urlPage = useMemo(() => {
    const raw = searchParams.get(PURCHASE_DOC_URL_PAGE);
    const n = parseInt(raw || String(searchPage), 10);
    return Math.max(1, Number.isFinite(n) ? n : searchPage);
  }, [searchParams, searchPage]);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  const pushSearchToUrl = useCallback(
    (q: string, page: number) => {
      const next = new URLSearchParams(searchParams.toString());
      const t = q.trim();
      if (t) {
        next.set(PURCHASE_DOC_URL_QUERY, t);
      } else {
        next.delete(PURCHASE_DOC_URL_QUERY);
      }
      next.set(PURCHASE_DOC_URL_PAGE, String(Math.max(1, page)));
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (draftSearch.trim() === searchQuery.trim()) {
        return;
      }
      pushSearchToUrl(draftSearch, 1);
    }, 400);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [draftSearch, pushSearchToUrl, searchQuery]);

  const [lines, setLines] = useState<PurchaseDocumentLine[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [docDate, setDocDate] = useState(todayIsoDate);
  const [invoiceFolio, setInvoiceFolio] = useState("");

  const selectedSupplierOption = useMemo(() => {
    if (supplierId == null || supplierId === "") {
      return null;
    }
    return supplierOptions.find((o) => String(o.id) === String(supplierId)) ?? null;
  }, [supplierId, supplierOptions]);

  const addVariant = useCallback((item: PurchasingVariantSearchItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.variantId === item.id ? { ...l, quantity: Math.max(1, l.quantity + 1) } : l,
        );
      }
      const price = Math.max(0, Math.round(item.pmp || 0));
      const row: PurchaseDocumentLine = {
        key: `${item.id}-${Date.now()}`,
        variantId: item.id,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        attributeValues: { ...item.attributeValues },
        quantity: 1,
        unitPrice: price,
        taxIds: [...item.defaultTaxIds],
      };
      return [...prev, row];
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<Pick<PurchaseDocumentLine, "quantity" | "unitPrice" | "taxIds">>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const toggleLineTax = useCallback((lineKey: string, taxId: string, checked: boolean) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== lineKey) {
          return l;
        }
        const set = new Set(l.taxIds);
        if (checked) {
          set.add(taxId);
        } else {
          set.delete(taxId);
        }
        return { ...l, taxIds: [...set] };
      }),
    );
  }, []);

  const totalPages = Math.max(1, Math.ceil(variantSearch.total / variantSearch.pageSize) || 1);

  const summary = useMemo(() => {
    const taxById = new Map(activeTaxes.map((t) => [t.id, t]));
    let subtotalNeto = 0;
    let impuestosTotal = 0;

    for (const line of lines) {
      const lineNet = line.quantity * line.unitPrice;
      subtotalNeto += lineNet;
      let rateSumPct = 0;
      for (const tid of line.taxIds) {
        const t = taxById.get(tid);
        if (t) {
          rateSumPct += Number(t.rate) || 0;
        }
      }
      impuestosTotal += Math.round((lineNet * rateSumPct) / 100);
    }

    const total = subtotalNeto + impuestosTotal;
    return { subtotalNeto, impuestosTotal, total };
  }, [lines, activeTaxes]);

  const modeLabel = mode === "reception" ? "recepción" : "orden de compra";
  const modeTitle = mode === "reception" ? "Recepción de compra" : "Orden de compra";

  const handleSave = useCallback(async () => {
    await onSave?.();
  }, [onSave]);

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch"
      data-test-id="purchase-document-builder"
    >
      <aside
        className="flex h-[80vh] min-h-0 w-full min-w-0 shrink-0 flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:max-w-sm lg:basis-[22rem]"
        data-test-id="purchase-document-search-panel"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buscar productos</p>
        <TextField
          label="Buscar"
          name="purchase-doc-variant-search"
          value={draftSearch}
          onChange={(e) => setDraftSearch(e.target.value)}
          placeholder="Nombre, SKU, código, categoría…"
          alwaysShowLabel
          startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
          data-test-id="purchase-doc-search-field"
        />
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {variantSearch.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            variantSearch.items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-border/80 bg-muted/20 p-2.5 shadow-sm"
                data-test-id={`purchase-doc-variant-card-${item.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <ProductNameWithAttributes
                      name={item.productName}
                      attributeValues={item.attributeValues}
                      className="text-sm font-medium text-foreground"
                    />
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-muted-foreground">
                      <span>
                        SKU {item.sku}
                      </span>
                      {item.barcode ? (
                        <>
                          <InlineSepDot />
                          <span>{item.barcode}</span>
                        </>
                      ) : null}
                    </p>
                    {item.categoryName ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.categoryName}</p>
                    ) : null}
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums text-foreground">
                      <span>PMP {formatMoney(item.pmp)}</span>
                      {item.unitLabel ? (
                        <>
                          <InlineSepDot />
                          <span className="text-muted-foreground">{item.unitLabel}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <IconButton
                    icon="Plus"
                    variant="basicSecondary"
                    size="sm"
                    title="Agregar a la lista"
                    ariaLabel="Agregar variante al documento"
                    onClick={() => addVariant(item)}
                    data-test-id={`purchase-doc-add-${item.id}`}
                  />
                </div>
              </article>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">
            Pág. {urlPage} / {totalPages} ({variantSearch.total} variantes)
          </span>
          <div className="flex gap-1">
            <IconButton
              icon="ChevronLeft"
              variant="basicSecondary"
              size="sm"
              disabled={urlPage <= 1}
              title="Anterior"
              ariaLabel="Página anterior"
              onClick={() => pushSearchToUrl(draftSearch, urlPage - 1)}
              data-test-id="purchase-doc-search-prev"
            />
            <IconButton
              icon="ChevronRight"
              variant="basicSecondary"
              size="sm"
              disabled={urlPage >= totalPages}
              title="Siguiente"
              ariaLabel="Página siguiente"
              onClick={() => pushSearchToUrl(draftSearch, urlPage + 1)}
              data-test-id="purchase-doc-search-next"
            />
          </div>
        </div>
      </aside>

      <section
        className="flex h-[80vh] min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-3"
        data-test-id="purchase-document-detail-panel"
      >
        <div className="flex w-full min-w-0 flex-col gap-3" data-test-id="purchase-doc-header-fields">
          <h2 className="truncate text-sm font-semibold text-foreground" data-test-id="purchase-doc-title">
            {modeTitle}
          </h2>
          <div className="grid w-full min-w-0 grid-cols-1 items-start gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-1">
            <div className="min-w-0 w-full self-stretch">
              <AutoComplete
                label="Proveedor"
                name="purchase-doc-supplier"
                placeholder="Buscar o seleccionar…"
                options={supplierOptions}
                value={selectedSupplierOption}
                onChange={(opt) => setSupplierId(opt ? String(opt.id) : null)}
                alwaysShowLabel
                data-test-id="purchase-doc-supplier"
              />
            </div>
            <div className="min-w-0 w-full self-stretch">
              <TextField
                label="Fecha"
                name="purchase-doc-date"
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full min-w-0"
                data-test-id="purchase-doc-date"
              />
            </div>
            <div className="min-w-0 w-full self-stretch">
              <Select
                label="Almacén destino"
                name="purchase-doc-storage"
                placeholder="Seleccionar"
                options={storageOptions}
                value={storageId}
                onChange={(id) => setStorageId(id == null ? null : String(id))}
                allowClear
                alwaysShowLabel
                className="w-full min-w-0"
                data-test-id="purchase-doc-storage"
              />
            </div>
            <div className="min-w-0 w-full self-stretch">
              <TextField
                label="Folio factura"
                name="purchase-doc-invoice-folio"
                value={invoiceFolio}
                onChange={(e) => setInvoiceFolio(e.target.value)}
                placeholder="Ej: 12345"
                alwaysShowLabel
                className="w-full min-w-0"
                data-test-id="purchase-doc-invoice-folio"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto">
          <table
            className="w-full min-w-[760px] table-fixed border-collapse text-sm"
            data-test-id="purchase-doc-lines-table"
          >
            <colgroup>
              <col className="min-w-0" />
              <col className="w-36" />
              <col className="w-40" />
              <col className="min-w-[12rem] w-[12rem]" />
              <col className="w-36" />
              <col className="w-12" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2">Producto</th>
                <th className="py-2 pr-2">Cantidad</th>
                <th className="py-2 pr-2">Precio de compra neto</th>
                <th className="py-2 pr-2">Impuestos</th>
                <th className="py-2 pr-2 text-right">Subtotal</th>
                <th className="w-12 py-2 text-center"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Agregue variantes desde el panel izquierdo. Detalle de {modeLabel} (borrador).
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.key} className="border-b border-border/70 align-top" data-test-id={`purchase-doc-line-${line.key}`}>
                    <td className="py-2 pr-2">
                      <ProductNameWithAttributes
                        name={line.productName}
                        attributeValues={line.attributeValues}
                        className="font-medium text-foreground"
                      />
                      <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-xs text-muted-foreground">
                        <span>{line.sku}</span>
                        {line.barcode ? (
                          <>
                            <InlineSepDot />
                            <span>{line.barcode}</span>
                          </>
                        ) : null}
                      </p>
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <NumberStepper
                        value={line.quantity}
                        onChange={(v) =>
                          updateLine(line.key, { quantity: Math.max(1, Math.round(Number(v))) })
                        }
                        min={1}
                        step={1}
                        allowNegative={false}
                        data-test-id={`purchase-doc-qty-${line.key}`}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <TextField
                        label=""
                        name={`price-${line.key}`}
                        type="currency"
                        currencySymbol="$"
                        startSymbol="$"
                        value={String(line.unitPrice)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.round(Number(e.target.value) || 0));
                          updateLine(line.key, { unitPrice: n });
                        }}
                        density="compact"
                        className="w-full min-w-0"
                        data-test-id={`purchase-doc-price-${line.key}`}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
                        {activeTaxes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sin impuestos definidos</span>
                        ) : (
                          activeTaxes.map((tax) => (
                            <Switch
                              key={tax.id}
                              checked={line.taxIds.includes(tax.id)}
                              onChange={(checked) => toggleLineTax(line.key, tax.id, checked)}
                              label={`${tax.name} (${tax.rate}%)`}
                              labelPosition="right"
                              data-test-id={`purchase-doc-tax-${line.key}-${tax.id}`}
                            />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2 align-middle text-right tabular-nums font-medium text-foreground">
                      {formatMoney(line.quantity * line.unitPrice)}
                    </td>
                    <td className="py-2 align-middle text-center">
                      <IconButton
                        icon="Trash2"
                        variant="basicSecondary"
                        size="sm"
                        title="Quitar línea"
                        ariaLabel="Quitar línea"
                        onClick={() => removeLine(line.key)}
                        data-test-id={`purchase-doc-remove-${line.key}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto flex w-full min-w-0 shrink-0 flex-col gap-0">
          <footer
            className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm"
            data-test-id="purchase-doc-summary"
          >
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal neto</span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-subtotal-net">
                {formatMoney(summary.subtotalNeto)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Impuestos</span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-taxes">
                {formatMoney(summary.impuestosTotal)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <span className="font-medium text-foreground">Total</span>
              <span className="tabular-nums font-semibold text-foreground" data-test-id="purchase-doc-summary-total">
                {formatMoney(summary.total)}
              </span>
            </div>
          </footer>
          <div className="flex justify-end pt-3">
            <Button
              variant="primary"
              size="md"
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              data-test-id="purchase-doc-save"
            >
              {isSaving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
