"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import { updateProductVariantAction } from "@/features/inventory-products/actions/product.action";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { listAttributesForPage } from "@/features/inventory-attributes/actions/attribute.action";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import type { ProductGridRow, ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import {
  deriveBasePriceFromPriceRows,
  effectiveIvaFactor,
  netToGross,
  roundMoneyInt,
} from "@/features/inventory-products/domain/price-tax-math";
import {
  priceListItemsToVariantRows,
  VariantPriceRowsEditor,
  type VariantPriceRowModel,
} from "./VariantPriceRowsEditor";
import { VariantPmpPriceCalculatorDialog } from "./VariantPmpPriceCalculatorDialog";
import { VariantAttributesPickerDialog } from "./VariantAttributesPickerDialog";
import { EntityMultimediaPanel } from "./EntityMultimediaPanel";

function catalogDefaultIvaTaxIds(taxes: TaxListItem[]): string[] {
  const iva = taxes.filter((t) => t.isActive && t.taxType === "IVA");
  const defaults = iva.filter((t) => t.isDefault).map((t) => t.id);
  if (defaults.length > 0) {
    return defaults;
  }
  return iva[0]?.id != null ? [iva[0].id] : [];
}

export type EditProductVariantDialogProps = {
  open: boolean;
  onClose: () => void;
  product: ProductGridRow;
  variant: ProductVariantGridRow;
  productType?: string | null;
  onSuccess?: () => void | Promise<void>;
};

export function EditProductVariantDialog({
  open,
  onClose,
  product,
  variant,
  productType = "PHYSICAL",
  onSuccess,
}: EditProductVariantDialogProps) {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [trackInventory, setTrackInventory] = useState(true);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [minimumStock, setMinimumStock] = useState("0");
  const [maximumStock, setMaximumStock] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListListItem[]>([]);
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [priceRows, setPriceRows] = useState<VariantPriceRowModel[]>([]);
  const [pmpCalculatorRowKey, setPmpCalculatorRowKey] = useState<string | null>(null);
  const [draftPmp, setDraftPmp] = useState(0);
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  const [attributeSelections, setAttributeSelections] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [attributesPickerOpen, setAttributesPickerOpen] = useState(false);

  const ivaTaxes = useMemo(
    () => taxes.filter((t) => t.isActive && t.taxType === "IVA"),
    [taxes],
  );

  const defaultIvaTaxIds = useMemo(() => catalogDefaultIvaTaxIds(taxes), [taxes]);

  const selectableAttributes = useMemo(() => {
    return [...attributes]
      .filter((a) => a.isActive && Array.isArray(a.options) && a.options.length > 0)
      .sort((a, b) => {
        const o = a.displayOrder - b.displayOrder;
        if (o !== 0) {
          return o;
        }
        return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
      });
  }, [attributes]);

  const unitOptions: Option[] = useMemo(() => {
    return [...units]
      .filter((u) => u.active)
      .sort((a, b) =>
        `${a.name} ${a.symbol}`.localeCompare(`${b.name} ${b.symbol}`, "es", { sensitivity: "base" }),
      )
      .map((u) => ({
        id: u.id,
        label: `${u.name}${u.symbol ? ` (${u.symbol})` : ""}`,
      }));
  }, [units]);

  const completedPriceRows = useMemo(
    () => priceRows.filter((r) => Boolean(r.priceListId?.trim())),
    [priceRows],
  );

  const derivedBasePrice = useMemo(() => {
    if (completedPriceRows.length === 0) {
      return null;
    }
    return deriveBasePriceFromPriceRows(completedPriceRows);
  }, [completedPriceRows]);

  useEffect(() => {
    if (!open || !variant?.id) {
      return;
    }
    setLoadError(null);
    setError(null);
    void (async () => {
      try {
        const [list, pls, txs, attrs] = await Promise.all([
          listUnitsForPage(),
          listPriceListsForPage(),
          listTaxesForPage(),
          listAttributesForPage(),
        ]);
        setUnits(list);
        setPriceLists(pls);
        setTaxes(txs);
        setAttributes(attrs);

        const defaultIva = catalogDefaultIvaTaxIds(txs);
        setPriceRows(priceListItemsToVariantRows(variant.priceListItems ?? [], defaultIva));
        setSku(variant.sku ?? "");
        setBarcode(variant.barcode?.trim() ?? "");
        setUnitId(variant.unitId?.trim() ? variant.unitId.trim() : null);
        setIsActive(variant.isActive !== false);
        const isService = String(productType || "").toUpperCase() === "SERVICE";
        setTrackInventory(
          typeof variant.trackInventory === "boolean" ? variant.trackInventory : !isService,
        );
        setAllowNegativeStock(variant.allowNegativeStock === true);
        setMinimumStock("0");
        setMaximumStock("0");
        setReorderPoint("0");
        setDraftPmp(Math.max(0, Math.round(Number(variant.pmp ?? 0))));

        const attrSel: Record<string, string | null> = {};
        const activeAttrs = [...attrs]
          .filter((a) => a.isActive && Array.isArray(a.options) && a.options.length > 0)
          .sort((a, b) => {
            const o = a.displayOrder - b.displayOrder;
            return o !== 0 ? o : a.name.localeCompare(b.name, "es", { sensitivity: "base" });
          });
        const av = variant.attributeValues ?? {};
        for (const a of activeAttrs) {
          const raw = av[a.id];
          attrSel[a.id] = raw != null && String(raw).trim() !== "" ? String(raw).trim() : null;
        }
        setAttributeSelections(attrSel);

        if (list.length === 0) {
          setLoadError("No hay unidades de medida. Cree una en Inventario → Unidades.");
        } else if (!list.some((u) => u.active)) {
          setLoadError("No hay unidades de medida activas. Active al menos una en Inventario → Unidades.");
        } else if (!pls.some((p) => p.isActive)) {
          setLoadError("No hay listas de precios activas. Cree una en Ventas → Listas de precios.");
        }
      } catch {
        setLoadError("No se pudieron cargar unidades, listas de precios o impuestos.");
      }
    })();
  }, [open, variant.id, variant.sku, productType]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const pid = product.id?.trim() ?? "";
    const vid = variant.id?.trim() ?? "";
    if (!pid || !vid) {
      setError("Datos de producto o variante no válidos");
      return;
    }
    if (!sku.trim()) {
      setError("El SKU es obligatorio");
      return;
    }
    if (!unitId) {
      setError("Seleccione una unidad de medida");
      return;
    }

    const incompleteRow = priceRows.some((r) => !r.priceListId?.trim());
    if (incompleteRow) {
      setError("Seleccione una lista de precios en cada fila.");
      return;
    }

    const filteredRows = priceRows.filter((r) => r.priceListId?.trim());
    if (filteredRows.length === 0) {
      setError("Agregue al menos un precio vinculado a una lista de precios.");
      return;
    }

    const dup = new Set<string>();
    for (const r of filteredRows) {
      const lid = r.priceListId!.trim();
      if (dup.has(lid)) {
        setError("No puede repetir la misma lista de precios en más de una fila.");
        return;
      }
      dup.add(lid);
    }
    const derived = deriveBasePriceFromPriceRows(filteredRows);
    if (derived === null) {
      setError("No se pudo determinar el precio de referencia a partir de las filas.");
      return;
    }
    const basePrice = derived;
    const priceListItems = filteredRows.map((r) => ({
      priceListId: r.priceListId!.trim(),
      netPrice: roundMoneyInt(r.net),
      grossPrice: roundMoneyInt(r.gross),
      taxIds: r.taxIds.length > 0 ? r.taxIds : undefined,
    }));

    const attributeValues: Record<string, string> = {};
    for (const a of selectableAttributes) {
      const raw = attributeSelections[a.id];
      if (raw == null || String(raw).trim() === "") {
        continue;
      }
      const val = String(raw).trim();
      if (!a.options.includes(val)) {
        setError(`El valor seleccionado no es válido para «${a.name}».`);
        return;
      }
      attributeValues[a.id] = val;
    }
    const attributeValuesPayload =
      Object.keys(attributeValues).length > 0 ? attributeValues : undefined;

    startTransition(() => {
      void (async () => {
        const r = await updateProductVariantAction(vid, {
          productId: pid,
          sku: sku.trim(),
          barcode: barcode.trim() || null,
          basePrice,
          unitId: String(unitId),
          isActive,
          priceListItems,
          pmp: draftPmp,
          attributeValues: attributeValuesPayload,
          trackInventory,
          allowNegativeStock,
          minimumStock: Math.max(0, Math.round(Number(minimumStock) || 0)),
          maximumStock: Math.max(0, Math.round(Number(maximumStock) || 0)),
          reorderPoint: Math.max(0, Math.round(Number(reorderPoint) || 0)),
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const handlePmpCalculatorApply = (pmp: number, net: number, priceRowKey: string) => {
    setDraftPmp(Math.max(0, Math.round(pmp)));
    setPriceRows((prev) =>
      prev.map((r) => {
        if (r.key !== priceRowKey) {
          return r;
        }
        const f = effectiveIvaFactor(ivaTaxes, r.taxIds);
        const n = roundMoneyInt(net);
        return { ...r, net: n, gross: netToGross(n, f), lastEdited: "net" as const };
      }),
    );
  };

  const canSubmit =
    Boolean(product.id?.trim()) &&
    Boolean(variant.id?.trim()) &&
    Boolean(sku.trim()) &&
    Boolean(unitId) &&
    !isPending &&
    !loadError &&
    !priceRows.some((r) => !r.priceListId?.trim()) &&
    priceRows.length > 0 &&
    derivedBasePrice !== null;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title="Editar variante"
        size="lg"
        scroll="paper"
        maxHeight="min(90vh, 720px)"
        data-test-id="product-variant-edit-dialog"
        alertArea={
          <>
            {loadError ? (
              <Alert variant="error" data-test-id="product-variant-edit-load-error">
                {loadError}
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="error" data-test-id="product-variant-edit-error">
                {error}
              </Alert>
            ) : null}
          </>
        }
        actions={
          <>
            <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="product-variant-edit-cancel">
              Cancelar
            </Button>
            <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="product-variant-edit-submit">
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-4">
          <p className="text-sm text-muted-foreground" data-test-id="product-variant-edit-product">
            Producto: <span className="font-medium text-foreground">{product.name || "—"}</span>
          </p>
          <div className="flex w-full min-w-0 flex-row gap-3">
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="SKU"
                name="pv-edit-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código SKU"
                required
                className="w-full"
                data-test-id="product-variant-edit-sku"
              />
            </div>
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="Código de barras (opcional)"
                name="pv-edit-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Código de barras"
                className="w-full"
                data-test-id="product-variant-edit-barcode"
              />
            </div>
          </div>

          <div className="min-w-0">
            <Select
              label="Unidad de medida"
              name="pv-edit-unit"
              options={unitOptions}
              value={unitId}
              onChange={(v) => setUnitId(v != null ? String(v) : null)}
              placeholder="Unidad"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-edit-unit"
            />
          </div>

          {selectableAttributes.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/15 p-3">
              <p className="text-sm font-medium text-foreground">Atributos (opcional)</p>
              <p className="text-xs text-muted-foreground">
                Combinación de esta variante. Solo se envían los atributos con valor elegido.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5 text-sm">
                  {selectableAttributes.map((a) => (
                    <div key={a.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="text-muted-foreground">{a.name}</span>
                      <span className="font-medium text-foreground">
                        {attributeSelections[a.id] ?? "Sin definir"}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outlined"
                    size="sm"
                    onClick={() => setAttributesPickerOpen(true)}
                    data-test-id="product-variant-edit-attrs-open"
                  >
                    Elegir valores
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <VariantPriceRowsEditor
            priceLists={priceLists}
            ivaTaxes={ivaTaxes}
            rows={priceRows}
            onRowsChange={setPriceRows}
            defaultIvaTaxIds={defaultIvaTaxIds}
            onOpenPmpCalculator={(rowKey) => setPmpCalculatorRowKey(rowKey)}
          />
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/15 p-3 md:grid-cols-2">
            <Switch
              checked={trackInventory}
              onChange={setTrackInventory}
              label="Controlar inventario"
              labelPosition="right"
              data-test-id="product-variant-edit-track-inventory"
            />
            <Switch
              checked={allowNegativeStock}
              onChange={setAllowNegativeStock}
              label="Permitir stock negativo"
              labelPosition="right"
              data-test-id="product-variant-edit-allow-negative"
            />
            <TextField
              label="Stock mínimo"
              name="pv-edit-minimum-stock"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              placeholder="0"
              data-test-id="product-variant-edit-minimum-stock"
            />
            <TextField
              label="Stock máximo"
              name="pv-edit-maximum-stock"
              value={maximumStock}
              onChange={(e) => setMaximumStock(e.target.value)}
              placeholder="0"
              data-test-id="product-variant-edit-maximum-stock"
            />
            <TextField
              label="Punto de reposición"
              name="pv-edit-reorder-point"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              placeholder="0"
              data-test-id="product-variant-edit-reorder-point"
            />
          </div>
          <div className="pt-1">
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label="Activa"
              labelPosition="right"
              data-test-id="product-variant-edit-active"
            />
          </div>

          <div className="border-t border-border pt-4">
            <EntityMultimediaPanel
              entityType="product-variant"
              entityId={variant.id}
              title="Imágenes de la variante"
              collectionOnly
              onChanged={() => router.refresh()}
            />
          </div>
        </div>
      </Dialog>
      <VariantPmpPriceCalculatorDialog
        open={pmpCalculatorRowKey != null}
        onClose={() => setPmpCalculatorRowKey(null)}
        initialPmp={draftPmp}
        priceRowKey={pmpCalculatorRowKey}
        taxIdsForPreview={
          pmpCalculatorRowKey != null
            ? (priceRows.find((r) => r.key === pmpCalculatorRowKey)?.taxIds ?? [])
            : []
        }
        ivaTaxes={ivaTaxes}
        onApply={handlePmpCalculatorApply}
      />
      <VariantAttributesPickerDialog
        open={attributesPickerOpen}
        onClose={() => setAttributesPickerOpen(false)}
        attributes={selectableAttributes}
        selections={attributeSelections}
        onSave={(next) =>
          setAttributeSelections((prev) => ({
            ...prev,
            ...next,
          }))
        }
        data-test-id="product-variant-edit-attrs-picker"
      />
    </>
  );
}
