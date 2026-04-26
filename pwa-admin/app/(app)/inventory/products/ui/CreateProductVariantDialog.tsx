"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import { createProductVariantAction } from "@/features/inventory-products/actions/product.action";
import { listUnitsForPage } from "@/features/inventory-units/actions/unit.action";
import type { UnitListItem } from "@/features/inventory-units/types/unit.types";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { listAttributesForPage } from "@/features/inventory-attributes/actions/attribute.action";
import type { AttributeListItem } from "@/features/inventory-attributes/types/attribute.types";
import {
  deriveBasePriceFromPriceRows,
  effectiveIvaFactor,
  netToGross,
  roundMoneyInt,
} from "@/features/inventory-products/domain/price-tax-math";
import {
  createVariantPriceRow,
  VariantPriceRowsEditor,
  type VariantPriceRowModel,
} from "./VariantPriceRowsEditor";
import { VariantPmpPriceCalculatorDialog } from "./VariantPmpPriceCalculatorDialog";

/** IVA marcado como predeterminado en catálogo; si no hay ninguno, se usa el primer IVA activo. */
function catalogDefaultIvaTaxIds(taxes: TaxListItem[]): string[] {
  const iva = taxes.filter((t) => t.isActive && t.taxType === "IVA");
  const defaults = iva.filter((t) => t.isDefault).map((t) => t.id);
  if (defaults.length > 0) {
    return defaults;
  }
  return iva[0]?.id != null ? [iva[0].id] : [];
}

export type CreateProductVariantDialogProps = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  /** PMP de referencia (p. ej. promedio de variantes existentes); la variante nueva aún no tiene PMP en BD. */
  referencePmp?: number;
  onSuccess?: () => void | Promise<void>;
};

export function CreateProductVariantDialog({
  open,
  onClose,
  productId,
  productName,
  referencePmp = 0,
  onSuccess,
}: CreateProductVariantDialogProps) {
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListListItem[]>([]);
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [priceRows, setPriceRows] = useState<VariantPriceRowModel[]>([]);
  /** Fila para la que está abierta la calculadora PMP (null = cerrado). */
  const [pmpCalculatorRowKey, setPmpCalculatorRowKey] = useState<string | null>(null);
  const [draftPmp, setDraftPmp] = useState(0);
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  /** attributeId → valor de opción elegido (null = sin definir). */
  const [attributeSelections, setAttributeSelections] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  /** `variant.basePrice` en API: neto de la primera fila con lista (orden del array). */
  const derivedBasePrice = useMemo(() => {
    if (completedPriceRows.length === 0) {
      return null;
    }
    return deriveBasePriceFromPriceRows(completedPriceRows);
  }, [completedPriceRows]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraftPmp(Math.max(0, Math.round(Number(referencePmp) || 0)));
  }, [open, referencePmp]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSku("");
    setBarcode("");
    setUnitId(null);
    setIsActive(true);
    setPriceRows([]);
    setAttributeSelections({});
    setError(null);
    setLoadError(null);
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
        const activePriceLists = pls.filter((p) => p.isActive);
        const defaultPriceListId =
          activePriceLists.find((p) => p.isDefault)?.id ?? activePriceLists[0]?.id ?? null;
        setPriceRows([createVariantPriceRow(defaultIva, defaultPriceListId)]);
        const defaultUnit = list.find((u) => u.active) ?? null;
        setUnitId(defaultUnit?.id ?? null);
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
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    if (!productId.trim()) {
      setError("Producto no válido");
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
      const id = r.priceListId!.trim();
      if (dup.has(id)) {
        setError("No puede repetir la misma lista de precios en más de una fila.");
        return;
      }
      dup.add(id);
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
        const r = await createProductVariantAction({
          productId: productId.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || null,
          basePrice,
          unitId: String(unitId),
          isActive,
          priceListItems,
          pmp: draftPmp,
          attributeValues: attributeValuesPayload,
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
    Boolean(productId.trim()) &&
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
      title="Crear variante"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="product-variant-create-dialog"
      alertArea={
          <>
            {loadError ? (
              <Alert variant="error" data-test-id="product-variant-create-load-error">
                {loadError}
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="error" data-test-id="product-variant-create-error">
                {error}
              </Alert>
            ) : null}
          </>
        }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="product-variant-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-test-id="product-variant-create-submit"
          >
            Crear variante
          </Button>
        </>
      }
    >
        <div className="flex w-full min-w-0 flex-col gap-4">
          <p className="text-sm text-muted-foreground" data-test-id="product-variant-create-product">
            Producto: <span className="font-medium text-foreground">{productName || "—"}</span>
          </p>
          <div className="flex w-full min-w-0 flex-row gap-3">
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="SKU"
                name="pv-create-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Código SKU"
                required
                className="w-full"
                data-test-id="product-variant-create-sku"
              />
            </div>
            <div className="min-w-0 flex-1 basis-0">
              <TextField
                label="Código de barras (opcional)"
                name="pv-create-barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Código de barras"
                className="w-full"
                data-test-id="product-variant-create-barcode"
              />
            </div>
          </div>

          <div className="min-w-0">
            <Select
              label="Unidad de medida"
              name="pv-create-unit"
              options={unitOptions}
              value={unitId}
              onChange={(v) => setUnitId(v != null ? String(v) : null)}
              placeholder="Unidad"
              required
              disabled={unitOptions.length === 0}
              data-test-id="product-variant-create-unit"
            />
          </div>

          {selectableAttributes.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/15 p-3">
              <p className="text-sm font-medium text-foreground">Atributos (opcional)</p>
              <p className="text-xs text-muted-foreground">
                Defina la combinación de esta variante. Solo se envían los atributos con valor elegido.
              </p>
              <div className="flex flex-col gap-3">
                {selectableAttributes.map((a) => {
                  const opts: Option[] = a.options.map((opt) => ({ id: opt, label: opt }));
                  return (
                    <Select
                      key={a.id}
                      label={a.name}
                      name={`pv-create-attr-${a.id}`}
                      options={opts}
                      value={attributeSelections[a.id] ?? null}
                      onChange={(v) =>
                        setAttributeSelections((prev) => ({
                          ...prev,
                          [a.id]: v != null && String(v).trim() !== "" ? String(v) : null,
                        }))
                      }
                      placeholder="Sin definir"
                      allowClear
                      alwaysShowLabel
                      data-test-id={`product-variant-create-attr-${a.id}`}
                    />
                  );
                })}
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
          <div className="pt-1">
            <Switch
              checked={isActive}
              onChange={setIsActive}
              label="Activa"
              labelPosition="right"
              data-test-id="product-variant-create-active"
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
    </>
  );
}
