"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Barcode, Search } from "lucide-react";
import Link from "next/link";
import { Alert, Button, DotProgress, IconButton, Switch, TextField } from "@/shared";
import BarcodeScanner from "./BarcodeScanner";
import StorageStockCard from "@/features/stock/components/StorageStockCard";
import QuickCreateProductDialog from "./QuickCreateProductDialog";
import { lookupVariantAction } from "../actions/variant.action";
import { getVariantDetailAction } from "../actions/variant.action";
import { getVariantStockAction, listStoragesAction } from "@/features/stock/actions/stock.action";
import type { ScanMode } from "../domain/scan-mode.entity";
import type { VariantDetail, VariantLookupItem } from "../types/variant.types";
import type { StorageOption, VariantStockRow } from "@/features/stock/types/stock.types";

export default function VariantScannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantIdParam = searchParams.get("variantId")?.trim() || "";

  const [skuMode, setSkuMode] = useState(false);
  const mode: ScanMode = skuMode ? "sku" : "barcode";
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [pickerItems, setPickerItems] = useState<VariantLookupItem[] | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateCode, setQuickCreateCode] = useState("");
  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [stock, setStock] = useState<VariantStockRow | null>(null);
  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [pending, startTransition] = useTransition();

  const inputLabel = mode === "sku" ? "SKU" : "Código de barras";

  const loadDetail = useCallback(async (variantId: string, sku?: string) => {
    setError("");
    const [detailRes, stockRes, storagesRes] = await Promise.all([
      getVariantDetailAction(variantId),
      getVariantStockAction(variantId, sku),
      listStoragesAction(),
    ]);
    if (!detailRes.success) {
      setError(detailRes.error);
      return;
    }
    setVariant(detailRes.variant);
    if (stockRes.success) {
      setStock(stockRes.row);
    } else {
      setStock(null);
      setError(stockRes.error);
    }
    if (storagesRes.success) {
      setStorages(storagesRes.storages);
    }
    router.replace(`/variant?variantId=${encodeURIComponent(variantId)}`);
  }, [router]);

  useEffect(() => {
    if (!variantIdParam) {
      setVariant(null);
      setStock(null);
      return;
    }
    startTransition(() => {
      void loadDetail(variantIdParam);
    });
  }, [variantIdParam, loadDetail]);

  const handleLookup = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setPickerItems(null);
    setNotFoundCode(null);
    setQuickCreateOpen(false);
    setError("");
    startTransition(async () => {
      const r = await lookupVariantAction({ code: trimmed, mode });
      if (!r.success) {
        setError(r.error);
        return;
      }
      if (r.items.length === 0) {
        setNotFoundCode(trimmed);
        return;
      }
      if (r.items.length === 1) {
        await loadDetail(r.items[0].variantId, r.items[0].sku);
        return;
      }
      setPickerItems(r.items);
    });
  };

  const showScanner = !variantIdParam;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <span className={`text-sm ${!skuMode ? "font-semibold" : "text-muted-foreground"}`}>
          MODO CÓDIGO
        </span>
        <Switch checked={skuMode} onChange={setSkuMode} aria-label="Cambiar modo SKU" />
        <span className={`text-sm ${skuMode ? "font-semibold" : "text-muted-foreground"}`}>
          MODO SKU
        </span>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {notFoundCode ? (
        <div
          className="relative rounded-lg border border-[var(--color-warning)] bg-transparent p-4 pb-12"
          role="alert"
          data-test-id="variant-not-found-alert"
        >
          <p className="text-sm text-foreground pb-10">
            No existe una variante con el código <strong>{notFoundCode}</strong>. ¿Deseas registrar un
            producto nuevo?
          </p>
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-2">
            <IconButton
              icon="X"
              variant="basicSecondary"
              size="sm"
              ariaLabel="Cerrar"
              disabled={pending}
              onClick={() => setNotFoundCode(null)}
              data-test-id="variant-not-found-dismiss"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pending}
              onClick={() => {
                setQuickCreateCode(notFoundCode);
                setNotFoundCode(null);
                setQuickCreateOpen(true);
              }}
              data-test-id="variant-not-found-create"
            >
              Crear producto
            </Button>
          </div>
        </div>
      ) : null}

      {showScanner ? (
        <>
          <BarcodeScanner onScan={handleLookup} paused={pending} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(manualCode);
            }}
            className="flex flex-col gap-3"
          >
            <TextField
              label={inputLabel}
              placeholder={inputLabel}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              disabled={pending}
            />
            <Button type="submit" loading={pending} disabled={pending}>
              <Search size={18} className="mr-2 inline" />
              Buscar
            </Button>
          </form>
        </>
      ) : null}

      {pending && !variant ? (
        <div className="flex justify-center py-8">
          <DotProgress />
        </div>
      ) : null}

      {pickerItems && pickerItems.length > 1 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Varias coincidencias:</p>
          {pickerItems.map((item) => (
            <Button
              key={item.variantId}
              type="button"
              variant="secondary"
              onClick={() => {
                setPickerItems(null);
                void loadDetail(item.variantId, item.sku);
              }}
            >
              {item.productName} — {item.sku}
            </Button>
          ))}
        </div>
      ) : null}

      <QuickCreateProductDialog
        open={quickCreateOpen}
        scannedCode={quickCreateCode}
        mode={mode}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={(variantId, sku) => {
          setQuickCreateOpen(false);
          void loadDetail(variantId, sku);
        }}
      />

      {variant ? (
        <section className="flex flex-col gap-4">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">SKU</p>
                <p className="font-semibold">{variant.sku}</p>
                <p className="mt-1 text-sm">{variant.productName}</p>
                {variant.barcode ? (
                  <p className="mt-1 text-xs text-muted-foreground">Código: {variant.barcode}</p>
                ) : null}
                {Object.keys(variant.attributeValues).length > 0 ? (
                  <ul className="mt-2 text-xs text-muted-foreground">
                    {Object.entries(variant.attributeValues).map(([k, v]) => (
                      <li key={k}>
                        {k}: {v}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <Link
                href={`/variant/barcode?variantId=${encodeURIComponent(variant.variantId)}`}
                className="shrink-0 rounded-lg border border-border p-2"
                aria-label="Actualizar código de barras"
              >
                <Barcode size={20} />
              </Link>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setVariant(null);
                setStock(null);
                setPickerItems(null);
                setNotFoundCode(null);
                router.replace("/variant");
              }}
            >
              Escanear otro
            </Button>
          </div>

          {stock?.storageBreakdown.length ? (
            <div className="flex flex-col gap-3">
              {stock.storageBreakdown.map((s) => (
                <StorageStockCard
                  key={s.storageId}
                  variantId={variant.variantId}
                  storage={s}
                  allStorages={storages}
                  onUpdated={() => void loadDetail(variant.variantId, variant.sku)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin stock registrado en almacenes.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
