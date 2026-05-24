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

type VariantThresholdDraft = {
  enabled: boolean;
  value: string;
};

type StorageThresholdFieldDraft = {
  /** true = umbral propio del almacén; false = heredar variante */
  override: boolean;
  enabled: boolean;
  value: string;
};

type StorageThresholdDraft = {
  storageId: string;
  storageName: string;
  minimum: StorageThresholdFieldDraft;
  maximum: StorageThresholdFieldDraft;
  reorder: StorageThresholdFieldDraft;
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

function storageFieldFromBreakdown(
  valueOverride: number | null | undefined,
  enabledOverride: boolean | null | undefined,
): StorageThresholdFieldDraft {
  const hasValueOverride = valueOverride !== null && valueOverride !== undefined;
  const hasEnabledOverride = enabledOverride !== null && enabledOverride !== undefined;
  const override = hasValueOverride || hasEnabledOverride;
  return {
    override,
    enabled: hasEnabledOverride ? Boolean(enabledOverride) : false,
    value: hasValueOverride ? numToInput(valueOverride) : "",
  };
}

function inheritedThresholdDisplay(variant: VariantThresholdDraft): string {
  if (!variant.enabled) {
    return "—";
  }
  return variant.value.trim() !== "" ? variant.value : "0";
}

function VariantThresholdField({
  label,
  name,
  draft,
  onChange,
  disabled,
  dataTestId,
}: {
  label: string;
  name: string;
  draft: VariantThresholdDraft;
  onChange: (next: VariantThresholdDraft) => void;
  disabled?: boolean;
  dataTestId?: string;
}) {
  return (
    <TextField
      label={label}
      name={name}
      type="number"
      min={0}
      density="compact"
      labelLayout="inline"
      selectOnFocus
      disabled={disabled || !draft.enabled}
      value={draft.value}
      onChange={(e) => onChange({ ...draft, value: e.target.value })}
      data-test-id={dataTestId}
      inlineLeadingAdornment={
        <Switch
          density="compact"
          checked={draft.enabled}
          onChange={(enabled) => onChange({ ...draft, enabled })}
          disabled={disabled}
          data-test-id={`${dataTestId}-enabled`}
        />
      }
    />
  );
}

function StorageThresholdField({
  label,
  name,
  draft,
  variantDraft,
  onChange,
  disabled,
  dataTestId,
}: {
  label: string;
  name: string;
  draft: StorageThresholdFieldDraft;
  variantDraft: VariantThresholdDraft;
  onChange: (next: StorageThresholdFieldDraft) => void;
  disabled?: boolean;
  dataTestId?: string;
}) {
  const inherited = inheritedThresholdDisplay(variantDraft);
  const inheriting = !draft.override;
  const switchChecked = inheriting ? false : draft.enabled;
  const fieldValue = inheriting ? inherited : draft.value;
  const fieldReadOnly = inheriting || !draft.enabled;

  const handleSwitchChange = (on: boolean) => {
    if (inheriting && on) {
      onChange({
        override: true,
        enabled: true,
        value: variantDraft.enabled ? variantDraft.value || "0" : "0",
      });
      return;
    }
    if (!inheriting && !on) {
      onChange({ override: false, enabled: false, value: "" });
      return;
    }
    onChange({ ...draft, enabled: on });
  };

  return (
    <TextField
      label={label}
      name={name}
      type={fieldReadOnly ? "text" : "number"}
      min={fieldReadOnly ? undefined : 0}
      density="compact"
      labelLayout="inline"
      selectOnFocus={!fieldReadOnly}
      readOnly={inheriting}
      disabled={disabled || (!inheriting && !draft.enabled)}
      value={fieldValue}
      onChange={(e) => onChange({ ...draft, value: e.target.value })}
      data-test-id={dataTestId}
      title={inheriting ? `Heredado de variante: ${inherited}` : undefined}
      inlineLeadingAdornment={
        <Switch
          density="compact"
          checked={switchChecked}
          onChange={handleSwitchChange}
          disabled={disabled}
          data-test-id={`${dataTestId}-enabled`}
        />
      }
    />
  );
}

function storageFieldForSave(
  draft: StorageThresholdFieldDraft,
): { value: number | null; enabled: boolean | null } {
  if (!draft.override) {
    return { value: null, enabled: null };
  }
  return {
    enabled: draft.enabled,
    value: parseThresholdInput(draft.value),
  };
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
  const [minimumDraft, setMinimumDraft] = useState<VariantThresholdDraft>({
    enabled: false,
    value: "0",
  });
  const [maximumDraft, setMaximumDraft] = useState<VariantThresholdDraft>({
    enabled: false,
    value: "0",
  });
  const [reorderDraft, setReorderDraft] = useState<VariantThresholdDraft>({
    enabled: false,
    value: "0",
  });
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
      setMinimumDraft({
        enabled: v.minimumStockEnabled === true,
        value: numToInput(v.minimumStock) || "0",
      });
      setMaximumDraft({
        enabled: v.maximumStockEnabled === true,
        value: numToInput(v.maximumStock) || "0",
      });
      setReorderDraft({
        enabled: v.reorderPointEnabled === true,
        value: numToInput(v.reorderPoint) || "0",
      });

      const merged = mergeStoragesForThresholds(storages, row.storageBreakdown ?? [], branchId);
      setStorageDrafts(
        merged.map((b) => ({
          storageId: b.storageId,
          storageName: b.branchName ? `${b.storageName} (${b.branchName})` : b.storageName,
          minimum: storageFieldFromBreakdown(
            b.minimumStockOverride,
            b.minimumStockEnabledOverride,
          ),
          maximum: storageFieldFromBreakdown(
            b.maximumStockOverride,
            b.maximumStockEnabledOverride,
          ),
          reorder: storageFieldFromBreakdown(
            b.reorderPointOverride,
            b.reorderPointEnabledOverride,
          ),
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
    const minVal = Math.max(0, Math.round(Number(minimumDraft.value) || 0));
    const maxVal = Math.max(0, Math.round(Number(maximumDraft.value) || 0));
    const reorderVal = Math.max(0, Math.round(Number(reorderDraft.value) || 0));

    startTransition(() => {
      void (async () => {
        const r = await saveVariantStockConfigAction({
          variantId: row.variantId,
          trackInventory,
          allowNegativeStock,
          minimumStock: minVal,
          minimumStockEnabled: minimumDraft.enabled,
          maximumStock: maxVal,
          maximumStockEnabled: maximumDraft.enabled,
          reorderPoint: reorderVal,
          reorderPointEnabled: reorderDraft.enabled,
          storageThresholds: storageDrafts.map((s) => {
            const min = storageFieldForSave(s.minimum);
            const max = storageFieldForSave(s.maximum);
            const rep = storageFieldForSave(s.reorder);
            return {
              storageId: s.storageId,
              minimumStock: min.value,
              minimumStockEnabled: min.enabled,
              maximumStock: max.value,
              maximumStockEnabled: max.enabled,
              reorderPoint: rep.value,
              reorderPointEnabled: rep.enabled,
            };
          }),
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
            </div>
            <p className="text-xs text-muted-foreground">
              Active cada umbral con el interruptor; el valor solo aplica si está habilitado.
            </p>
            <div className="grid gap-3">
              <VariantThresholdField
                label="Stock mínimo"
                name="stock-config-min"
                draft={minimumDraft}
                onChange={setMinimumDraft}
                data-test-id="stock-config-min"
              />
              <VariantThresholdField
                label="Stock máximo"
                name="stock-config-max"
                draft={maximumDraft}
                onChange={setMaximumDraft}
                data-test-id="stock-config-max"
              />
              <VariantThresholdField
                label="Punto de reposición"
                name="stock-config-reorder"
                draft={reorderDraft}
                onChange={setReorderDraft}
                data-test-id="stock-config-reorder"
              />
            </div>
          </div>

          {storageDrafts.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Por almacén (opcional)
              </p>
              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {storageDrafts.map((s, idx) => (
                  <div
                    key={s.storageId}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                    data-test-id={`stock-config-storage-${s.storageId}`}
                  >
                    <p className="mb-2 text-sm font-medium text-foreground">{s.storageName}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <StorageThresholdField
                        label="Mín."
                        name={`st-min-${s.storageId}`}
                        draft={s.minimum}
                        variantDraft={minimumDraft}
                        onChange={(next) => {
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, minimum: next } : x)),
                          );
                        }}
                        dataTestId={`st-min-${s.storageId}`}
                      />
                      <StorageThresholdField
                        label="Máx."
                        name={`st-max-${s.storageId}`}
                        draft={s.maximum}
                        variantDraft={maximumDraft}
                        onChange={(next) => {
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, maximum: next } : x)),
                          );
                        }}
                        dataTestId={`st-max-${s.storageId}`}
                      />
                      <StorageThresholdField
                        label="Repos."
                        name={`st-reorder-${s.storageId}`}
                        draft={s.reorder}
                        variantDraft={reorderDraft}
                        onChange={(next) => {
                          setStorageDrafts((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, reorder: next } : x)),
                          );
                        }}
                        dataTestId={`st-reorder-${s.storageId}`}
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
