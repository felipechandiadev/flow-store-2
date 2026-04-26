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

export type CreateProductVariantDialogProps = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onSuccess?: () => void | Promise<void>;
};

function parseBasePrice(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function CreateProductVariantDialog({
  open,
  onClose,
  productId,
  productName,
  onSuccess,
}: CreateProductVariantDialogProps) {
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unitOptions: Option[] = useMemo(
    () =>
      units
        .filter((u) => u.active)
        .map((u) => ({
          id: u.id,
          label: `${u.name}${u.symbol ? ` (${u.symbol})` : ""}`,
        })),
    [units],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setSku("");
    setBarcode("");
    setBasePrice("0");
    setUnitId(null);
    setIsActive(true);
    setError(null);
    setLoadError(null);
    void (async () => {
      try {
        const list = await listUnitsForPage();
        setUnits(list);
        const firstActive = list.find((u) => u.active);
        setUnitId(firstActive?.id ?? null);
        if (!list.some((u) => u.active)) {
          setLoadError("No hay unidades de medida activas. Cree una en Inventario → Unidades.");
        }
      } catch {
        setLoadError("No se pudieron cargar las unidades de medida.");
      }
    })();
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const price = parseBasePrice(basePrice);
    if (price === null) {
      setError("Precio base no válido");
      return;
    }
    if (price < 0) {
      setError("El precio base no puede ser negativo");
      return;
    }
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
    startTransition(() => {
      void (async () => {
        const r = await createProductVariantAction({
          productId: productId.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || null,
          basePrice: price,
          unitId: String(unitId),
          isActive,
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

  const canSubmit =
    Boolean(productId.trim()) &&
    Boolean(sku.trim()) &&
    Boolean(unitId) &&
    parseBasePrice(basePrice) !== null &&
    (parseBasePrice(basePrice) ?? 0) >= 0 &&
    !isPending &&
    !loadError;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nueva variante"
      size="md"
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
        <TextField
          label="Precio base"
          name="pv-create-base-price"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          placeholder="0"
          data-test-id="product-variant-create-base-price"
        />
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
  );
}
