"use client";

import { useEffect, useMemo, useState } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select } from "@/shared/components/Select";
import { listMetalPricesForPage } from "@/features/metal-prices/actions/metal-price.action";
import { METAL_SELECT_OPTIONS } from "@/features/metal-prices/lib/metal-options";
import { latestMetalPriceByMetal } from "@/features/metal-prices/lib/metal-price-latest";
import type { MetalTypeOption } from "@/features/metal-prices/types/metal-price.types";
import {
  computeJewelryNetPrice,
  parseJewelryMoneyField,
  parseJewelryPercent,
} from "@/features/inventory-products/domain/jewelry-price-math";

export type VariantJewelryPriceCalculatorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Peso inicial en gramos (formulario de variante o BD). */
  weightGrams: number;
  /** Al cambiar o aplicar, sincroniza el peso con el formulario padre. */
  onWeightGramsChange?: (grams: number) => void;
  priceRowKey: string | null;
  onApply: (net: number, priceRowKey: string) => void;
};

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function parseWeightGramsInput(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    return 0;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Number(n.toFixed(3));
}

export function VariantJewelryPriceCalculatorDialog({
  open,
  onClose,
  weightGrams,
  onWeightGramsChange,
  priceRowKey,
  onApply,
}: VariantJewelryPriceCalculatorDialogProps) {
  const [selectedMetal, setSelectedMetal] = useState<MetalTypeOption>("Oro 18K");
  const [metalPrice, setMetalPrice] = useState<number | null>(null);
  const [metalPricesLoading, setMetalPricesLoading] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [merma, setMerma] = useState("0");
  const [utilidad, setUtilidad] = useState("0");
  const [costoPiedras, setCostoPiedras] = useState("0");
  const [manufacture, setManufacture] = useState("0");
  const [otrosCostos, setOtrosCostos] = useState("0");

  useEffect(() => {
    if (!open) {
      return;
    }
    setWeightInput(weightGrams > 0 ? String(weightGrams) : "");
    setMerma("0");
    setUtilidad("0");
    setCostoPiedras("0");
    setManufacture("0");
    setOtrosCostos("0");
    setSelectedMetal("Oro 18K");
  }, [open, weightGrams]);

  useEffect(() => {
    if (!open || !selectedMetal) {
      return;
    }
    let cancelled = false;
    setMetalPricesLoading(true);
    void (async () => {
      try {
        const rows = await listMetalPricesForPage();
        if (cancelled) {
          return;
        }
        setMetalPrice(latestMetalPriceByMetal(rows, selectedMetal));
      } finally {
        if (!cancelled) {
          setMetalPricesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedMetal]);

  const effectiveWeightGrams = useMemo(() => parseWeightGramsInput(weightInput), [weightInput]);

  const netPrice = useMemo(
    () =>
      computeJewelryNetPrice({
        weightGrams: effectiveWeightGrams,
        metalPricePerGram: metalPrice ?? 0,
        mermaPercent: parseJewelryPercent(merma),
        utilityPercent: parseJewelryPercent(utilidad),
        stonesCost: parseJewelryMoneyField(costoPiedras),
        laborCost: parseJewelryMoneyField(manufacture),
        otherCosts: parseJewelryMoneyField(otrosCostos),
      }),
    [effectiveWeightGrams, metalPrice, merma, utilidad, costoPiedras, manufacture, otrosCostos],
  );

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const grams = parseWeightGramsInput(value);
    if (grams > 0) {
      onWeightGramsChange?.(grams);
    }
  };

  const handleApply = () => {
    if (priceRowKey == null || priceRowKey === "") {
      onClose();
      return;
    }
    if (effectiveWeightGrams > 0) {
      onWeightGramsChange?.(effectiveWeightGrams);
    }
    onApply(Math.round(netPrice), priceRowKey);
    onClose();
  };

  const weightMissing = effectiveWeightGrams <= 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Calculadora de precio (joyería)"
      size="md"
      zIndex={2000}
      scroll="paper"
      data-test-id="variant-jewelry-calculator-dialog"
      alertArea={
        weightMissing ? (
          <Alert variant="warning">
            Ingrese el peso de la pieza en gramos (campo abajo) para calcular el precio.
          </Alert>
        ) : metalPrice == null && !metalPricesLoading ? (
          <Alert variant="warning">
            No hay precio registrado para {selectedMetal}. Configúrelo en Configuración → Precios de
            metales.
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={onClose} data-test-id="variant-jewelry-calc-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleApply}
            disabled={weightMissing || metalPrice == null}
            data-test-id="variant-jewelry-calc-apply"
          >
            Aplicar precio neto
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <Select
          label="Tipo de metal"
          value={selectedMetal}
          onChange={(v) => setSelectedMetal((v as MetalTypeOption) || "Oro 18K")}
          options={METAL_SELECT_OPTIONS}
          data-test-id="variant-jewelry-calc-metal"
        />
        <Alert variant="info">
          Precio del {selectedMetal}:{" "}
          <strong>
            {metalPricesLoading
              ? "Cargando…"
              : metalPrice != null
                ? fmtClp(metalPrice)
                : "No disponible"}
          </strong>{" "}
          <span className="text-muted-foreground">(CLP por gramo)</span>
        </Alert>
        <TextField
          label="Peso (gramos)"
          name="jewelry-calc-weight"
          value={weightInput}
          onChange={(e) => handleWeightChange(e.target.value)}
          placeholder="Ej: 5.2"
          inputMode="decimal"
          required
          data-test-id="variant-jewelry-calc-weight"
        />
        <TextField
          label="Merma (%)"
          name="jewelry-calc-merma"
          type="number"
          value={merma}
          onChange={(e) => setMerma(e.target.value)}
          data-test-id="variant-jewelry-calc-merma"
        />
        <TextField
          label="Utilidad (%)"
          name="jewelry-calc-utilidad"
          type="number"
          value={utilidad}
          onChange={(e) => setUtilidad(e.target.value)}
          data-test-id="variant-jewelry-calc-utilidad"
        />
        <TextField
          label="Costo de piedras"
          name="jewelry-calc-piedras"
          type="currency"
          currencySymbol="$"
          value={costoPiedras}
          onChange={(e) => setCostoPiedras(e.target.value)}
          data-test-id="variant-jewelry-calc-piedras"
        />
        <TextField
          label="Hechura / mano de obra"
          name="jewelry-calc-labor"
          type="currency"
          currencySymbol="$"
          value={manufacture}
          onChange={(e) => setManufacture(e.target.value)}
          data-test-id="variant-jewelry-calc-labor"
        />
        <TextField
          label="Otros costos"
          name="jewelry-calc-other"
          type="currency"
          currencySymbol="$"
          value={otrosCostos}
          onChange={(e) => setOtrosCostos(e.target.value)}
          data-test-id="variant-jewelry-calc-other"
        />
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Precio neto calculado
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground" data-test-id="variant-jewelry-calc-preview">
            {fmtClp(netPrice)}
          </p>
          <p className="mt-1 text-[10px] italic text-muted-foreground">
            [(Peso × (1 + Merma%)) × PrecioMetal + Piedras + ManoObra + Otros] × (1 + Utilidad%)
          </p>
        </div>
      </div>
    </Dialog>
  );
}
