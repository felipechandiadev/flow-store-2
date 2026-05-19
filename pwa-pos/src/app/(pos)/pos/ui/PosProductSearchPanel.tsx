"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchPosProductsAction } from "@/features/pos-products/actions/pos-products.action";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  looksLikeBarcodeScan,
  shouldAutoAddSingleResult,
} from "@/features/pos-products/lib/pos-barcode-scan";
import {
  clampPosProductSearchPageSize,
  POS_PRODUCT_SEARCH_DEBOUNCE_MS,
  POS_PRODUCT_SEARCH_DEFAULT_PAGE_SIZE,
  readPosProductSearchPageSize,
  writePosProductSearchPageSize,
} from "@/features/pos-products/lib/posProductSearchStorage";
import { InlineSepDot, formatMoney, PosProductNameWithAttributes } from "@/features/pos-products/ui/posProductPreview";
import { patchPosContextClient, type PosPriceListSnapshot } from "@/features/session/lib/pos-context-storage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
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
  pointOfSaleId: string;
  onPriceListChange: (id: string) => void;
  onPickProduct?: (item: PosProductSearchItem) => void;
  disabled?: boolean;
  disabledHint?: string;
};

export default function PosProductSearchPanel({
  priceListId,
  priceListOptions,
  branchId,
  pointOfSaleId,
  onPriceListChange,
  onPickProduct,
  disabled = false,
  disabledHint,
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
  const searchFieldWrapRef = useRef<HTMLDivElement>(null);
  /** Tras Enter o código tipo barras: agregar al carrito si hay un solo resultado. */
  const scanAutoAddRef = useRef(false);
  const [scanAddedHint, setScanAddedHint] = useState("");

  const focusSearchField = useCallback(() => {
    searchFieldWrapRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  const clearSearch = useCallback(() => {
    setDraftSearch("");
    setSearchQuery("");
    searchCommittedRef.current = "";
    setPage(1);
  }, []);

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
      if (looksLikeBarcodeScan(next, 8)) {
        scanAutoAddRef.current = true;
      }
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
  }, [pageSize, priceListId, branchId, pointOfSaleId]);

  const tryAutoAddSingleResult = useCallback(
    (products: PosProductSearchItem[], totalCount: number, currentPage: number) => {
      if (
        !shouldAutoAddSingleResult({
          total: totalCount,
          itemCount: products.length,
          page: currentPage,
          scanIntent: scanAutoAddRef.current,
        })
      ) {
        scanAutoAddRef.current = false;
        return false;
      }
      scanAutoAddRef.current = false;
      if (disabled || !onPickProduct) return false;
      onPickProduct(products[0]!);
      clearSearch();
      setScanAddedHint(`${products[0]!.productName} agregado al carrito`);
      focusSearchField();
      return true;
    },
    [clearSearch, disabled, focusSearchField, onPickProduct],
  );

  useEffect(() => {
    if (!scanAddedHint) return;
    const t = window.setTimeout(() => setScanAddedHint(""), 2200);
    return () => clearTimeout(t);
  }, [scanAddedHint]);

  const load = useCallback(async () => {
    if (!canSearch) return;
    setLoading(true);
    setError("");
    try {
      const res = await searchPosProductsAction({
        query: searchQuery,
        priceListId,
        branchId,
        pointOfSaleId,
        page,
        pageSize,
      });
      if (!res.success) {
        scanAutoAddRef.current = false;
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(res.products);
      setTotal(res.pagination.total);
      setResultPageSize(res.pagination.pageSize);
      tryAutoAddSingleResult(res.products, res.pagination.total, page);
    } catch (e) {
      scanAutoAddRef.current = false;
      setError(e instanceof Error ? e.message : "Error al buscar");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    canSearch,
    searchQuery,
    priceListId,
    branchId,
    pointOfSaleId,
    page,
    pageSize,
    tryAutoAddSingleResult,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchTextPending = draftSearch.trim() !== searchQuery.trim();

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / (resultPageSize || pageSize)) || 1),
    [total, resultPageSize, pageSize],
  );

  const flushDebouncedSearch = useCallback((): "committed" | "unchanged" => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const next = draftSearch.trim();
    if (next === searchCommittedRef.current.trim()) {
      return "unchanged";
    }
    if (looksLikeBarcodeScan(next)) {
      scanAutoAddRef.current = true;
    }
    setSearchQuery(draftSearch);
    setPage(1);
    return "committed";
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
      className="relative flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
      style={{ height: `${POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH}vh` }}
      data-test-id="pos-product-search-panel"
    >
      {disabled ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/75 p-4 text-center text-sm text-muted-foreground"
          aria-hidden
        >
          {disabledHint ?? "Búsqueda de productos deshabilitada en este modo."}
        </div>
      ) : null}
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

      <div ref={searchFieldWrapRef}>
      <TextField
        label="Buscar productos"
        name="pos-product-search"
        value={draftSearch}
        onChange={(e) => setDraftSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            scanAutoAddRef.current = true;
            const status = flushDebouncedSearch();
            if (status === "unchanged" && !loading) {
              tryAutoAddSingleResult(items, total, page);
            }
          }
        }}
        placeholder="Nombre, SKU, código de barras…"
        autoComplete="off"
        alwaysShowLabel
        startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
        data-test-id="pos-product-search-field"
        aria-busy={searchTextPending}
      />
      </div>

      {scanAddedHint ? (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400" role="status" data-test-id="pos-product-scan-added-hint">
          {scanAddedHint}
        </p>
      ) : null}

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
                      Stock:{" "}
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
                  disabled={disabled || !onPickProduct}
                  onClick={() => onPickProduct?.(item)}
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
