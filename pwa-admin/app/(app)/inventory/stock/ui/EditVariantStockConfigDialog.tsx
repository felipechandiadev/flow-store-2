"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Switch from "@/shared/components/Switch/Switch";
import type { StockGridRow, StockStorageBreakdownRow } from "@/features/inventory-stock/types/stock-grid.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { getProductVariantDetailForPage } from "@/features/inventory-products/actions/product.action";
import { saveVariantStockConfigAction } from "@/features/inventory-stock/actions/stock.action";

export type EditVariantStockConfigDialogProps = {
  open: boolean;
  row: StockGridRow | null;
  storages: StorageListItem[];
  branchId?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

type StorageThresholdDraft = {
  storageId: string;
  storageName: string;
  minimum: string;
  maximum: string;
  reorder: string;
};

function mergeStoragesForThresholds(
  storages: StorageListItem[],
  breakdown: StockStorageBreakdownRow[],
  branchId?: string,
): StockStorageBreakdownRow[] {
  const byId = new Map(breakdown.map((b) => [b.storageId, b]));
  const active = storages.filter((s) => s.isActive !== false);
  const scoped = branchId
    ? active.filter((s) => (s.branchId ?? s.branch?.id ?? "") === branchId)
    : active;
  const sorted = [...scoped].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
  if (sorted.length === 0) {
    return [...breakdown];
  }
  return sorted.map((s) => {
    const existing = byId.get(s.id);
    if (existing) {
      return existing;
    }
    return {
      storageId: s.id,
      storageName: s.name,
      branchName: s.branch?.name ?? null,
      quantity: 0,
      reservedStock: 0,
      availableStock: 0,
      committedStock: 0,
    };
  });
}

function numToInput(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) {
    return "";
  }
  return String(Math.max(0, Math.round(Number(v))));
}

function parseThresholdInput(raw: string): number | null {
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  const n = Math.round(Number(t.replace(",", ".")));
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return n;
}

export function EditVariantStockConfigDialog({
  open,
  row,
  storages,
  branchId,
  onClose,
  onSaved,
}: EditVariantStockConfigDialogProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [productType, setProductType] = useState<string | null>(null);
  const [trackInventory, setTrackInventory] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [minimumStock, setMinimumStock] = useState("0");
  const [maximumStock, setMaximumStock] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [storageDrafts, setStorageDrafts] = useState<StorageThresholdDraft[]>([]);

  const subtitle = useMemo(() => {
    if (!row) {
      return "";
    }
    const parts = [row.productName, row.sku ? `SKU ${row.sku}` : ""].filter(Boolean);
    return parts.join(" · ");
  }, [row]);

  useEffect(() => {
    if (!open || !row) {
      return;
    }
    let cancelled = false;
    setLoadError(null);
    setSaveError(null);
    setLoading(true);
    void (async () => {
      const r = await getProductVariantDetailForPage(row.variantId);
      if (cancelled) {
        return;
      }
      if (!r.ok) {
        setLoadError(r.error);
        setLoading(false);
        return;
      }
      const v = r.variant;
      const pt = r.product.productType;
      setProductType(pt);
      const isService = String(pt || "").toUpperCase() === "SERVICE";
      setTrackInventory(typeof v.trackInventory === "boolean" ? v.trackInventory : !isService);
      setAllowNegativeStock(v.allowNegativeStock === true);
      setMinimumStock(numToInput(v.minimumStock) || "0");
      setMaximumStock(numToInput(v.maximumStock) || "0");
      setReorderPoint(numToInput(v.reorderPoint) || "0");

      const merged = mergeStoragesForThresholds(storages, row.storageBreakdown ?? [], branchId);
      setStorageDrafts(
        merged.map((b) => ({
          storageId: b.storageId,
          storageName: b.branchName ? `${b.storageName} (${b.branchName})` : b.storageName,
          minimum: numToInput(b.minimumStockOverride),
          maximum: numToInput(b.maximumStockOverride),
          reorder: numToInput(b.reorderPointOverride),
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, row, storages, branchId]);

  const handleClose = () => {
    if (isPending) {
      return;
    }
    setSaveError(null);
    onClose();
  };

  const handleSave = () => {
    if (!row) {
      return;
    }
    setSaveError(null);
    const min = Math.max(0, Math.round(Number(minimumStock) || 0));
    const max = Math.max(0, Math.round(Number(maximumStock) || 0));
    const reorder = Math.max(0, Math.round(Number(reorderPoint) || 0));

    startTransition(() => {
      void (async () => {
        const r = await saveVariantStockConfigAction({
          variantId: row.variantId,
          trackInventory,
          allowNegativeStock,
          minimumStock: min,
          maximumStock: max,
          reorderPoint: reorder,
          storageThresholds: storageDrafts.map((s) => ({
            storageId: s.storageId,
            minimumStock: parseThresholdInput(s.minimum),
            maximumStock: parseThresholdInput(s.maximum),
            reorderPoint: parseThresholdInput(s.reorder),
          })),
        });
        if (r.success) {
          await onSaved();
          handleClose();
        } else {
          setSaveError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Configuración de stock"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="stock-config-dialog"
      alertArea={
        loadError || saveError ? (
          <Alert variant="error" data-test-id="stock-config-error">
            {loadError ?? saveError}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" disabled={isPending || loading} onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={isPending || loading || Boolean(loadError)}
            onClick={handleSave}
            data-test-id="stock-config-save"
          >
            Guardar
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando variante…</p>
      ) : row ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">{subtitle}</p>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Variante (valores por defecto)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Switch
                checked={trackInventory}
                onChange={setTrackInventory}
                label="Controlar inventario"
                labelPosition="right"
                disabled={String(productType || "").toUpperCase() === "SERVICE"}
                data-test-id="stock-config-track"
              />
              <Switch
                checked={allowNegativeStock}
                onChange={setAllowNegativeStock}
                label="Permitir stock negativo"
                labelPosition="right"
                data-test-id="stock-config-negative"
              />
              <TextField
                label="Stock mínimo"
                name="stock-config-min"
                type="number"
                min={0}
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                data-test-id="stock-config-min"
              />
              <TextField
                label="Stock máximo"
                name="stock-config-max"
                type="number"
                min={0}
                value={maximumStock}
                onChange={(e) => setMaximumStock(e.target.value)}
                data-test-id="stock-config-max"
              />
              <TextField
                label="Punto de reposición"
                name="stock-config-reorder"
                type="number"
                min={0}
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                data-test-id="stock-config-reorder"
              />
            </div>
          </div>

          {storageDrafts.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Por almacén (opcional)
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Deje vacío un campo para heredar el valor de la variante en ese almacén.
                </p>
              </div>
              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {storageDrafts.map((s, idx) => (
                  <div
                    key={s.storageId}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                    data-test-id={`stock-config-storage-${s.storageId}`}
                  >
                    <p className="mb-2 text-sm font-medium text-foreground">{s.storageName}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <TextField
                        label="Mín."
                        name={`st-min-${s.storageId}`}
                        type="number"
                        min={0}
                        value={s.minimum}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, minimum: v } : x)),
                          );
                        }}
                      />
                      <TextField
                        label="Máx."
                        name={`st-max-${s.storageId}`}
                        type="number"
                        min={0}
                        value={s.maximum}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, maximum: v } : x)),
                          );
                        }}
                      />
                      <TextField
                        label="Repos."
                        name={`st-reorder-${s.storageId}`}
                        type="number"
                        min={0}
                        value={s.reorder}
                        onChange={(e) => {
                          const v = e.target.value;
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, reorder: v } : x)),
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
