"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { VariantAttributesPickerDialog } from "./VariantAttributesPickerDialog";
import { EntityMultimediaPanel } from "./EntityMultimediaPanel";
import { MultimediaUploader } from "@/shared/components/FileUploader/MultimediaUploader";
import { uploadMultimediaForEntityAction } from "@/features/multimedia/actions/multimedia.action";
import type { MultimediaEntityType } from "@/features/multimedia/types/multimedia.types";

async function uploadFilesToEntity(
  files: File[],
  entityType: MultimediaEntityType,
  entityId: string,
): Promise<string | null> {
  if (files.length === 0 || !entityId.trim()) {
    return null;
  }
  let markPrimary = true;
  for (const file of files) {
    const form = new FormData();
    form.append("file", file);
    form.append("entityType", entityType);
    form.append("entityId", entityId.trim());
    form.append("isPrimary", markPrimary ? "true" : "false");
    markPrimary = false;
    const r = await uploadMultimediaForEntityAction(form);
    if (!r.success) {
      return r.error;
    }
  }
  return null;
}

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
  productType?: string;
  /** PMP de referencia (p. ej. promedio de variantes existentes); la variante nueva aún no tiene PMP en BD. */
  referencePmp?: number;
  onSuccess?: () => void | Promise<void>;
};

export function CreateProductVariantDialog({
  open,
  onClose,
  productId,
  productName,
  productType = "PHYSICAL",
  referencePmp = 0,
  onSuccess,
}: CreateProductVariantDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "media">("form");
  const [newVariantId, setNewVariantId] = useState<string | null>(null);
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
  /** Fila para la que está abierta la calculadora PMP (null = cerrado). */
  const [pmpCalculatorRowKey, setPmpCalculatorRowKey] = useState<string | null>(null);
  const [draftPmp, setDraftPmp] = useState(0);
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  /** attributeId → valor de opción elegido (null = sin definir). */
  const [attributeSelections, setAttributeSelections] = useState<Record<string, string | null>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  /** Archivos elegidos antes de crear la variante (se suben al crear el SKU). */
  const [stagedVariantFiles, setStagedVariantFiles] = useState<File[]>([]);
  const [mediaStagingKey, setMediaStagingKey] = useState(0);
  const [postCreateUploadError, setPostCreateUploadError] = useState<string | null>(null);
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
    setPhase("form");
    setNewVariantId(null);
    setSku("");
    setBarcode("");
    setUnitId(null);
    setIsActive(true);
    const isService = String(productType || "").toUpperCase() === "SERVICE";
    setTrackInventory(!isService);
    setAllowNegativeStock(false);
    setMinimumStock("0");
    setMaximumStock("0");
    setReorderPoint("0");
    setPriceRows([]);
    setAttributeSelections({});
    setError(null);
    setLoadError(null);
    setStagedVariantFiles([]);
    setMediaStagingKey((k) => k + 1);
    setPostCreateUploadError(null);
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
    setPhase("form");
    setNewVariantId(null);
    setError(null);
    setStagedVariantFiles([]);
    setMediaStagingKey((k) => k + 1);
    setPostCreateUploadError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (phase !== "form") {
      return;
    }
    setError(null);
    setPostCreateUploadError(null);
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
          trackInventory,
          allowNegativeStock,
          minimumStock: Math.max(0, Math.round(Number(minimumStock) || 0)),
          maximumStock: Math.max(0, Math.round(Number(maximumStock) || 0)),
          reorderPoint: Math.max(0, Math.round(Number(reorderPoint) || 0)),
        });
        if (r.success) {
          setNewVariantId(r.id);
          if (stagedVariantFiles.length > 0) {
            const upErr = await uploadFilesToEntity(stagedVariantFiles, "product-variant", r.id);
            if (upErr) {
              setPostCreateUploadError(upErr);
            }
          }
          await router.refresh();
          setPhase("media");
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const handleFinalizeMedia = () => {
    startTransition(() => {
      void (async () => {
        await onSuccess?.();
        handleClose();
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
    phase === "form" &&
    Boolean(productId.trim()) &&
    Boolean(sku.trim()) &&
    Boolean(unitId) &&
    !isPending &&
    !loadError &&
    !priceRows.some((r) => !r.priceListId?.trim()) &&
    priceRows.length > 0 &&
    derivedBasePrice !== null;

  const canFinalizeMedia = phase === "media" && !isPending;

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      title={phase === "media" ? "Imágenes de la variante" : "Crear variante"}
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
            {phase === "media" && postCreateUploadError ? (
              <Alert variant="warning" data-test-id="product-variant-create-upload-warning">
                No se pudieron subir todos los archivos elegidos en el formulario: {postCreateUploadError}
              </Alert>
            ) : null}
          </>
        }
      actions={
        phase === "media" ? (
          <>
            <Button
              variant="outlined"
              size="md"
              onClick={handleClose}
              disabled={isPending}
              data-test-id="product-variant-create-cancel"
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleFinalizeMedia}
              disabled={!canFinalizeMedia}
              data-test-id="product-variant-create-finish-media"
            >
              Listo
            </Button>
          </>
        ) : (
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
        )
      }
    >
        {phase === "media" && newVariantId ? (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Variante creada. Las imágenes aquí son específicas de este SKU (operativas / vitrina por variante).
            </p>
            <EntityMultimediaPanel
              entityType="product-variant"
              entityId={newVariantId}
              title="Imágenes de la variante"
              collectionOnly
              onChanged={() => router.refresh()}
            />
          </div>
        ) : (
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
                    data-test-id="product-variant-create-attrs-open"
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
              data-test-id="product-variant-create-track-inventory"
            />
            <Switch
              checked={allowNegativeStock}
              onChange={setAllowNegativeStock}
              label="Permitir stock negativo"
              labelPosition="right"
              data-test-id="product-variant-create-allow-negative"
            />
            <TextField
              label="Stock mínimo"
              name="pv-create-minimum-stock"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              placeholder="0"
              data-test-id="product-variant-create-minimum-stock"
            />
            <TextField
              label="Stock máximo"
              name="pv-create-maximum-stock"
              value={maximumStock}
              onChange={(e) => setMaximumStock(e.target.value)}
              placeholder="0"
              data-test-id="product-variant-create-maximum-stock"
            />
            <TextField
              label="Punto de reposición"
              name="pv-create-reorder-point"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              placeholder="0"
              data-test-id="product-variant-create-reorder-point"
            />
          </div>

          <div
            className="rounded-lg border border-border bg-muted/10 p-3"
            data-test-id="product-variant-create-form-multimedia"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Multimedia</p>
            <MultimediaUploader
              key={`pv-create-staged-${mediaStagingKey}`}
              uploadPath="create-variant:staging"
              variant="collection"
              label=""
              buttonType="icon"
              accept="image/*,video/*"
              maxFiles={12}
              maxSize={9}
              aspectRatio="16:9"
              previewSize="sm"
              disabled={isPending}
              onChange={setStagedVariantFiles}
            />
          </div>

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
        )}
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
        data-test-id="product-variant-create-attrs-picker"
      />
    </>
  );
}
