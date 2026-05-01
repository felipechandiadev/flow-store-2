"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import IconButton from "@/shared/components/IconButton/IconButton";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
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

function formatAttributes(av: Record<string, string>): string {
  const vals = Object.values(av).filter((x) => x.trim());
  return vals.length > 0 ? vals.join(" · ") : "—";
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
    const lineCount = lines.length;
    const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
    return { lineCount, subtotal };
  }, [lines]);

  const modeLabel = mode === "reception" ? "recepción" : "orden de compra";

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
                    <p className="truncate text-sm font-medium text-foreground" title={item.productName}>
                      {item.productName}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      SKU {item.sku}
                      {item.barcode ? ` · ${item.barcode}` : ""}
                    </p>
                    {item.categoryName ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.categoryName}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-foreground">
                      <span className="text-muted-foreground">Atributos: </span>
                      {formatAttributes(item.attributeValues)}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-foreground">
                      PMP {formatMoney(item.pmp)}
                      {item.unitLabel ? <span className="text-muted-foreground"> · {item.unitLabel}</span> : null}
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
            Pág. {searchPage} / {totalPages} ({variantSearch.total} variantes)
          </span>
          <div className="flex gap-1">
            <IconButton
              icon="ChevronLeft"
              variant="basicSecondary"
              size="sm"
              disabled={searchPage <= 1}
              title="Anterior"
              ariaLabel="Página anterior"
              onClick={() => pushSearchToUrl(draftSearch, searchPage - 1)}
              data-test-id="purchase-doc-search-prev"
            />
            <IconButton
              icon="ChevronRight"
              variant="basicSecondary"
              size="sm"
              disabled={searchPage >= totalPages}
              title="Siguiente"
              ariaLabel="Página siguiente"
              onClick={() => pushSearchToUrl(draftSearch, searchPage + 1)}
              data-test-id="purchase-doc-search-next"
            />
          </div>
        </div>
      </aside>

      <section
        className="flex h-[80vh] min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-3"
        data-test-id="purchase-document-detail-panel"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-3">
            <Select
              label="Proveedor"
              name="purchase-doc-supplier"
              placeholder="Seleccionar"
              options={supplierOptions}
              value={supplierId}
              onChange={(id) => setSupplierId(id == null ? null : String(id))}
              allowClear
              data-test-id="purchase-doc-supplier"
            />
            <TextField
              label="Fecha"
              name="purchase-doc-date"
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              data-test-id="purchase-doc-date"
            />
            <Select
              label="Almacén destino"
              name="purchase-doc-storage"
              placeholder="Seleccionar"
              options={storageOptions}
              value={storageId}
              onChange={(id) => setStorageId(id == null ? null : String(id))}
              allowClear
              data-test-id="purchase-doc-storage"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm" data-test-id="purchase-doc-lines-table">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2">Producto</th>
                <th className="w-24 py-2 pr-2">Cantidad</th>
                <th className="w-36 py-2 pr-2">Precio compra</th>
                <th className="min-w-[12rem] py-2 pr-2">Impuestos</th>
                <th className="w-12 py-2 text-center"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Agregue variantes desde el panel izquierdo. Detalle de {modeLabel} (borrador).
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.key} className="border-b border-border/70 align-top" data-test-id={`purchase-doc-line-${line.key}`}>
                    <td className="py-2 pr-2">
                      <p className="font-medium text-foreground">{line.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {line.sku}
                        {line.barcode ? ` · ${line.barcode}` : ""}
                      </p>
                    </td>
                    <td className="py-2 pr-2">
                      <TextField
                        label=""
                        name={`qty-${line.key}`}
                        type="number"
                        min={1}
                        step={1}
                        value={String(line.quantity)}
                        onChange={(e) => {
                          const n = Math.max(1, Math.round(Number(e.target.value) || 1));
                          updateLine(line.key, { quantity: n });
                        }}
                        data-test-id={`purchase-doc-qty-${line.key}`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <TextField
                        label=""
                        name={`price-${line.key}`}
                        type="number"
                        min={0}
                        step={1}
                        value={String(line.unitPrice)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.round(Number(e.target.value) || 0));
                          updateLine(line.key, { unitPrice: n });
                        }}
                        data-test-id={`purchase-doc-price-${line.key}`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
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
                    <td className="py-2 text-center">
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

        <footer
          className="mt-auto flex flex-col gap-1 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm"
          data-test-id="purchase-doc-summary"
        >
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Líneas</span>
            <span className="tabular-nums font-medium">{summary.lineCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums font-semibold text-foreground">{formatMoney(summary.subtotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Total documento sin desglose fiscal compuesto (borrador). La persistencia se implementará con el backend
            de {modeLabel === "recepción" ? "recepciones" : "órdenes"}.
          </p>
        </footer>
      </section>
    </div>
  );
}
