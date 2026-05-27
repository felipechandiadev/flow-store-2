"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/shared/components/Alert/Alert";
import { TextField } from "@/shared/components/TextField/TextField";
import IconButton from "@/shared/components/IconButton/IconButton";
import { updateProductVariantLogisticsAction } from "@/features/inventory-products/actions/product.action";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";

function noop() {}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 6 }).format(n);
}

type VariantDetailLogisticsSectionProps = {
  variant: ProductVariantGridRow;
};

export function VariantDetailLogisticsSection({ variant }: VariantDetailLogisticsSectionProps) {
  const router = useRouter();
  const [netKg, setNetKg] = useState("");
  const [grossKg, setGrossKg] = useState("");
  const [lenCm, setLenCm] = useState("");
  const [widCm, setWidCm] = useState("");
  const [heiCm, setHeiCm] = useState("");
  const [divK, setDivK] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (editing) {
      return;
    }
    setNetKg(variant.netWeightKg != null && Number.isFinite(Number(variant.netWeightKg)) ? String(variant.netWeightKg) : "");
    setGrossKg(
      variant.grossWeightKg != null && Number.isFinite(Number(variant.grossWeightKg))
        ? String(variant.grossWeightKg)
        : "",
    );
    setLenCm(
      variant.packageLengthCm != null && Number.isFinite(Number(variant.packageLengthCm))
        ? String(variant.packageLengthCm)
        : "",
    );
    setWidCm(
      variant.packageWidthCm != null && Number.isFinite(Number(variant.packageWidthCm))
        ? String(variant.packageWidthCm)
        : "",
    );
    setHeiCm(
      variant.packageHeightCm != null && Number.isFinite(Number(variant.packageHeightCm))
        ? String(variant.packageHeightCm)
        : "",
    );
    setDivK(
      variant.volumetricDivisorK != null && Number.isFinite(Number(variant.volumetricDivisorK))
        ? String(variant.volumetricDivisorK)
        : "",
    );
  }, [variant, editing]);

  const volumetricPreview = useMemo(() => {
    const L = Number(String(lenCm).replace(",", "."));
    const W = Number(String(widCm).replace(",", "."));
    const H = Number(String(heiCm).replace(",", "."));
    const K = divK.trim() ? Math.round(Number(divK)) : 5000;
    if (![L, W, H].every((x) => Number.isFinite(x) && x > 0) || !(K > 0)) {
      return null;
    }
    return (L * W * H) / K;
  }, [lenCm, widCm, heiCm, divK]);

  const parseOptNum = (s: string): number | null => {
    const t = s.trim();
    if (!t) {
      return null;
    }
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const save = useCallback(() => {
    setError(null);
    setOk(null);
    const divKRaw = divK.trim();
    let divKParsed: number | null = null;
    if (divKRaw) {
      const n = Math.round(Number(divKRaw));
      if (!Number.isFinite(n) || n <= 0) {
        setError("El divisor K debe ser un entero mayor que 0.");
        return;
      }
      divKParsed = n;
    }
    startTransition(() => {
      void (async () => {
        const r = await updateProductVariantLogisticsAction(variant.id, {
          netWeightKg: parseOptNum(netKg),
          grossWeightKg: parseOptNum(grossKg),
          packageLengthCm: parseOptNum(lenCm),
          packageWidthCm: parseOptNum(widCm),
          packageHeightCm: parseOptNum(heiCm),
          volumetricDivisorK: divKParsed,
        });
        if (r.success) {
          setOk("Datos de despacho guardados.");
          setEditing(false);
          await router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  }, [variant.id, netKg, grossKg, lenCm, widCm, heiCm, divK, router]);

  const readOnly = !editing;

  const toggleEditOrSave = () => {
    setError(null);
    setOk(null);
    if (!editing) {
      setEditing(true);
      return;
    }
    save();
  };

  return (
    <section
      className={`relative space-y-3 rounded-lg border border-border bg-background p-4 pb-12 ${
        editing ? "ring-1 ring-primary/25" : ""
      }`}
      data-test-id="pv-section-logistics"
    >
      <h2 className="text-sm font-semibold text-foreground">Despacho para transportista</h2>
      <p className="text-xs text-muted-foreground">
        Peso neto (producto), peso bruto (con embalaje), dimensiones del empaque en centímetros y divisor K para peso
        volumétrico kg = (L×W×H)/K.
      </p>
      {error ? (
        <Alert variant="error" data-test-id="pv-detail-logistics-error">
          {error}
        </Alert>
      ) : null}
      {ok ? (
        <Alert variant="success" data-test-id="pv-detail-logistics-ok">
          {ok}
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Peso neto (kg)"
          name="pv-net-kg"
          value={netKg}
          onChange={readOnly ? noop : (e) => setNetKg(e.target.value)}
          readOnly={readOnly}
          placeholder="Ej: 0.25"
        />
        <TextField
          label="Peso bruto con embalaje (kg)"
          name="pv-gross-kg"
          value={grossKg}
          onChange={readOnly ? noop : (e) => setGrossKg(e.target.value)}
          readOnly={readOnly}
          placeholder="Ej: 0.31"
        />
        <TextField
          label="Largo empaque (cm)"
          name="pv-l"
          value={lenCm}
          onChange={readOnly ? noop : (e) => setLenCm(e.target.value)}
          readOnly={readOnly}
        />
        <TextField
          label="Ancho empaque (cm)"
          name="pv-w"
          value={widCm}
          onChange={readOnly ? noop : (e) => setWidCm(e.target.value)}
          readOnly={readOnly}
        />
        <TextField
          label="Alto empaque (cm)"
          name="pv-h"
          value={heiCm}
          onChange={readOnly ? noop : (e) => setHeiCm(e.target.value)}
          readOnly={readOnly}
        />
        <TextField
          label="Divisor K (volumétrico)"
          name="pv-k"
          value={divK}
          onChange={readOnly ? noop : (e) => setDivK(e.target.value)}
          readOnly={readOnly}
          placeholder="Vacío → 5000 en cálculo"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Peso volumétrico estimado:{" "}
        <strong className="text-foreground">
          {volumetricPreview != null ? `${formatNumber(volumetricPreview)} kg` : "—"}
        </strong>
        {divK.trim() ? "" : " (K=5000 por defecto)"}
      </p>
      <div className="absolute bottom-2 right-2">
        <IconButton
          icon={editing ? "Save" : "Pencil"}
          variant="basicSecondary"
          size="sm"
          ariaLabel={editing ? "Guardar despacho" : "Editar despacho"}
          onClick={toggleEditOrSave}
          disabled={pending}
          isLoading={pending}
          data-test-id="pv-detail-logistics-edit-save"
        />
      </div>
    </section>
  );
}
