"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPosProductsAction } from "@/features/pos-products/actions/pos-products.action";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  clampPosProductSearchPageSize,
  POS_PRODUCT_SEARCH_DEBOUNCE_MS,
  POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE,
  readPosProductSearchPageSize,
  writePosProductSearchPageSize,
} from "@/features/pos-products/lib/posProductSearchStorage";
import { InlineSepDot, formatMoney, PosProductNameWithAttributes } from "@/features/pos-products/ui/posProductPreview";
import { patchPosContextClient, type PosPriceListSnapshot } from "@/features/session/lib/pos-context-storage";
import {
  Button,
  Dialog,
  DotProgress,
  IconButton,
  NumberStepper,
  Select,
  TextField,
} from "@/shared/admin-shared";

/**
 * Alto del buscador de productos respecto al viewport (`vh`).
 * Ej.: `88` → el panel mide **88vh** (= 88% de la altura visible de la ventana).
 * Compartido con el carrito en `PosWorkspace` para alinear columnas.
 */
export const POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH = 88;

type Props = {
  priceListId: string;
  priceListOptions: PosPriceListSnapshot[];
  branchId: string | null;
  onPriceListChange: (id: string) => void;
  onPickProduct: (item: PosProductSearchItem) => void;
};

export default function PosProductSearchPanel({
  priceListId,
  priceListOptions,
  branchId,
  onPriceListChange,
  onPickProduct,
}: Props) {
  const [draftSearch, setDraftSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchCommittedRef = useRef("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftPageSize, setDraftPageSize] = useState(POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);
  const [draftPriceListId, setDraftPriceListId] = useState(priceListId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<PosProductSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [resultPageSize, setResultPageSize] = useState(POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const n = readPosProductSearchPageSize();
    setPageSize(n);
    setDraftPageSize(n);
  }, []);

  useEffect(() => {
    searchCommittedRef.current = searchQuery;
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const next = draftSearch.trim();
      if (next === searchCommittedRef.current.trim()) return;
      setSearchQuery(draftSearch);
      setPage(1);
    }, POS_PRODUCT_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draftSearch]);

  const canSearch = priceListId.trim() !== "";

  useEffect(() => {
    setPage(1);
  }, [pageSize, priceListId, branchId]);

  const load = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError("");
    try {
      const res = await searchPosProductsAction({
        query: searchQuery,
        priceListId,
        branchId,
        page,
        pageSize,
      });
      if (!res.success) {
        setError(res.message);
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(res.products);
      setTotal(res.pagination.total);
      setResultPageSize(res.pagination.pageSize);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al buscar");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canSearch, searchQuery, priceListId, branchId, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchTextPending = draftSearch.trim() !== searchQuery.trim();

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / (resultPageSize || pageSize)) || 1),
    [total, resultPageSize, pageSize],
  );

  const flushDebouncedSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (draftSearch.trim() === searchCommittedRef.current.trim()) return;
    setSearchQuery(draftSearch);
    setPage(1);
  }, [draftSearch]);

  const openSettings = useCallback(() => {
    setDraftPageSize(pageSize);
    setDraftPriceListId(priceListId);
    setSettingsOpen(true);
  }, [pageSize, priceListId]);

  const applySettings = useCallback(() => {
    const nextSize = clampPosProductSearchPageSize(draftPageSize);
    writePosProductSearchPageSize(nextSize);
    setPageSize(nextSize);
    if (draftPriceListId && draftPriceListId.trim() && draftPriceListId !== priceListId) {
      onPriceListChange(draftPriceListId);
      patchPosContextClient({ priceListId: draftPriceListId });
    }
    setPage(1);
    setSettingsOpen(false);
  }, [draftPageSize, draftPriceListId, onPriceListChange, priceListId]);

  const selectedPriceListName = useMemo(() => {
    const found = priceListOptions.find((p) => String(p.id) === String(priceListId));
    return found?.name?.trim() || "—";
  }, [priceListId, priceListOptions]);

  return (
    <aside
      className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
      style={{ height: `${POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH}vh` }}
      data-test-id="pos-product-search-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1" />
        <div className="flex min-w-0 items-center justify-end gap-2">
          <p
            className="min-w-0 truncate text-sm font-medium text-foreground"
            data-test-id="pos-product-selected-price-list"
            title={selectedPriceListName}
          >
            {selectedPriceListName}
          </p>
          <IconButton
            icon="Tags"
            variant="basicSecondary"
            size="sm"
            ariaLabel="Lista de precios"
            data-test-id="pos-product-price-list-icon"
          />
        </div>
      </div>

      <TextField
        label="Buscar productos"
        name="pos-product-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            flushDebouncedSearch();
          }
        }}
        placeholder="Nombre, SKU, código de barras…"
        alwaysShowLabel
        startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
        data-test-id="pos-product-search-field"
        aria-busy={searchTextPending}
      />

      {searchTextPending ? (
        <p className="text-xs text-muted-foreground" data-test-id="pos-product-search-pending">
          Sincronizando búsqueda…
        </p>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto"
        aria-busy={searchTextPending || loading}
        data-test-id="pos-product-search-results"
      >
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-10">
            <DotProgress />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin resultados.</p>
        ) : (
          items.map((item) => (
            <article
              key={item.variantId}
              className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              data-test-id={`pos-product-variant-card-${item.variantId}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <PosProductNameWithAttributes
                    name={item.productName}
                    attributes={item.attributes}
                    className="text-sm font-medium text-foreground"
                  />
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] text-muted-foreground">
                    <span>SKU {item.sku ?? "—"}</span>
                    {item.barcode?.trim() ? (
                      <>
                        <InlineSepDot />
                        <span>{item.barcode.trim()}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums text-foreground">
                    <span>{formatMoney(item.unitPriceWithTax)}</span>
                    {item.unitSymbol ? (
                      <>
                        <InlineSepDot />
                        <span className="text-muted-foreground">{item.unitSymbol}</span>
                      </>
                    ) : null}
                    <InlineSepDot />
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Stock sucursal:{" "}
                      <span className="font-semibold text-foreground">
                        {item.availableStock == null ? "—" : String(item.availableStock)}
                      </span>
                    </span>
                  </p>
                </div>
                <IconButton
                  icon="Plus"
                  variant="basicSecondary"
                  size="sm"
                  title="Agregar al carrito"
                  ariaLabel="Agregar producto al carrito"
                  onClick={() => onPickProduct(item)}
                  data-test-id={`pos-product-add-${item.variantId}`}
                />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconButton
            icon="Settings"
            variant="basicSecondary"
            size="sm"
            title="Configuración del buscador"
            ariaLabel="Abrir configuración del buscador de productos"
            onClick={openSettings}
            data-test-id="pos-product-search-settings"
          />
          <span className="truncate text-xs text-muted-foreground">
            Pág. {page} / {totalPages} ({total} productos)
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton
            icon="ChevronLeft"
            variant="basicSecondary"
            size="sm"
            disabled={page <= 1 || loading}
            title="Anterior"
            ariaLabel="Página anterior"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            data-test-id="pos-product-search-prev"
          />
          <IconButton
            icon="ChevronRight"
            variant="basicSecondary"
            size="sm"
            disabled={page >= totalPages || loading}
            title="Siguiente"
            ariaLabel="Página siguiente"
            onClick={() => setPage((p) => p + 1)}
            data-test-id="pos-product-search-next"
          />
        </div>
      </div>

      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configuración del buscador"
        size="sm"
        data-test-id="pos-product-search-settings-dialog"
        actions={
          <>
            <Button variant="secondary" type="button" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="button" onClick={applySettings}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Select
            label="Lista de precios"
            placeholder="Lista de precios"
            value={draftPriceListId || null}
            onChange={(id) => setDraftPriceListId(id ? String(id) : "")}
            options={priceListOptions.map((p) => ({ id: p.id, label: p.name }))}
            disabled={priceListOptions.length === 0}
            alwaysShowLabel
          />
        <NumberStepper
          label="Resultados por página"
          value={draftPageSize}
          onChange={(v) => setDraftPageSize(clampPosProductSearchPageSize(v))}
          min={1}
          max={50}
          step={1}
          allowNegative={false}
          data-test-id="pos-product-search-page-size"
        />
        </div>
      </Dialog>
    </aside>
  );
}
