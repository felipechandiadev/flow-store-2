"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import Alert from "@/shared/components/Alert/Alert";
import { TextField } from "@/shared/components/TextField/TextField";
import type { ProductGridRow, ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import {
  updateProductVariantLogisticsAction,
} from "@/features/inventory-products/actions/product.action";
import { EditProductVariantDialog } from "../../../ui/EditProductVariantDialog";
import { CreateRecipeDialog } from "../../../ui/CreateRecipeDialog";
import { EntityMultimediaPanel } from "../../../ui/EntityMultimediaPanel";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: currency || "CLP" }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 6 }).format(n);
}

function variantTitle(v: ProductVariantGridRow): string {
  const dn = v.displayName?.trim();
  if (dn) {
    return dn;
  }
  const av = v.attributeValues;
  if (av && Object.keys(av).length > 0) {
    const parts = Object.values(av).filter(Boolean);
    if (parts.length > 0) {
      return parts.join(", ");
    }
  }
  return v.sku;
}

function toProductGridRow(
  product: { id: string; name: string; productType: string | null; categoryName?: string | null },
  variant: ProductVariantGridRow,
): ProductGridRow {
  return {
    id: product.id,
    name: product.name,
    productType: product.productType,
    brand: null,
    description: null,
    categoryId: null,
    categoryName: product.categoryName ?? null,
    isActive: true,
    variantCount: 1,
    variants: [variant],
  };
}

type Props = {
  product: { id: string; name: string; productType: string | null; categoryName?: string | null };
  variant: ProductVariantGridRow;
};

export default function ProductVariantDetailPage({ product, variant: initialVariant }: Props) {
  const router = useRouter();
  const [variant, setVariant] = useState(initialVariant);
  const [editOpen, setEditOpen] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const [netKg, setNetKg] = useState("");
  const [grossKg, setGrossKg] = useState("");
  const [lenCm, setLenCm] = useState("");
  const [widCm, setWidCm] = useState("");
  const [heiCm, setHeiCm] = useState("");
  const [divK, setDivK] = useState("");
  const [logisticsError, setLogisticsError] = useState<string | null>(null);
  const [logisticsOk, setLogisticsOk] = useState<string | null>(null);
  const [logisticsPending, startLogistics] = useTransition();

  useEffect(() => {
    setVariant(initialVariant);
  }, [initialVariant]);

  useEffect(() => {
    const v = variant;
    setNetKg(v.netWeightKg != null && Number.isFinite(Number(v.netWeightKg)) ? String(v.netWeightKg) : "");
    setGrossKg(v.grossWeightKg != null && Number.isFinite(Number(v.grossWeightKg)) ? String(v.grossWeightKg) : "");
    setLenCm(v.packageLengthCm != null && Number.isFinite(Number(v.packageLengthCm)) ? String(v.packageLengthCm) : "");
    setWidCm(v.packageWidthCm != null && Number.isFinite(Number(v.packageWidthCm)) ? String(v.packageWidthCm) : "");
    setHeiCm(v.packageHeightCm != null && Number.isFinite(Number(v.packageHeightCm)) ? String(v.packageHeightCm) : "");
    setDivK(
      v.volumetricDivisorK != null && Number.isFinite(Number(v.volumetricDivisorK))
        ? String(v.volumetricDivisorK)
        : "",
    );
  }, [variant]);

  const productRow = useMemo(() => toProductGridRow(product, variant), [product, variant]);

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

  const pt = (product.productType ?? "PHYSICAL").toString().toUpperCase();
  const showRecipe = pt !== "DIGITAL";

  const parseOptNum = (s: string): number | null => {
    const t = s.trim();
    if (!t) {
      return null;
    }
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const saveLogistics = useCallback(() => {
    setLogisticsError(null);
    setLogisticsOk(null);
    const divKRaw = divK.trim();
    let divKParsed: number | null = null;
    if (divKRaw) {
      const n = Math.round(Number(divKRaw));
      if (!Number.isFinite(n) || n <= 0) {
        setLogisticsError("El divisor K debe ser un entero mayor que 0.");
        return;
      }
      divKParsed = n;
    }
    startLogistics(() => {
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
          setLogisticsOk("Datos de despacho guardados.");
          await router.refresh();
        } else {
          setLogisticsError(r.error);
        }
      })();
    });
  }, [variant.id, netKg, grossKg, lenCm, widCm, heiCm, divK, router]);

  /** Misma apariencia que `<Button variant="text" size="sm" />` (enlaces ancla no pueden ser `<button>`). */
  const sectionNavClass =
    "fs-button fs-button--text px-3 py-1.5 text-sm no-underline";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-16" data-test-id="product-variant-detail-root">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/inventory/products" className="hover:text-foreground hover:underline">
          Productos
        </Link>
        <span aria-hidden>/</span>
        <span className="min-w-0 truncate font-medium text-foreground" title={product.name}>
          {product.name}
        </span>
      </div>

      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{variantTitle(variant)}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{variant.sku}</p>
          {variant.barcode?.trim() ? (
            <p className="text-xs text-muted-foreground">Código de barras: {variant.barcode}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="primary" size="sm" type="button" onClick={() => setEditOpen(true)} data-test-id="pv-detail-edit-full">
            Editar variante
          </Button>
          {showRecipe ? (
            <Button variant="outlined" size="sm" type="button" onClick={() => setBomOpen(true)} data-test-id="pv-detail-bom">
              Receta (BOM)
            </Button>
          ) : null}
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border pb-2" aria-label="Secciones">
        <a className={sectionNavClass} href="#identidad">
          Identidad
        </a>
        <a className={sectionNavClass} href="#precios">
          Precios
        </a>
        <a className={sectionNavClass} href="#inventario">
          Inventario
        </a>
        <a className={sectionNavClass} href="#despacho">
          Despacho
        </a>
        <a className={sectionNavClass} href="#multimedia">
          Multimedia
        </a>
        {showRecipe ? (
          <a className={sectionNavClass} href="#receta">
            Receta
          </a>
        ) : null}
      </nav>

      <section id="identidad" className="scroll-mt-24 space-y-2 rounded-lg border border-border bg-background p-4">
        <h2 className="text-sm font-semibold text-foreground">Identidad y atributos</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>{variant.isActive !== false ? "Activa" : "Inactiva"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Unidad de venta (referencia)</dt>
            <dd>{variant.unitOfMeasure?.trim() ? variant.unitOfMeasure : "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Atributos</dt>
            <dd>
              {variant.attributeValues && Object.keys(variant.attributeValues).length > 0 ? (
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  {Object.entries(variant.attributeValues).map(([k, val]) => (
                    <li key={k}>
                      <span className="font-mono text-[11px]">{k.slice(0, 8)}…</span>: {val}
                    </li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Para cambiar SKU, código de barras, unidades o atributos use «Editar variante».
        </p>
      </section>

      <section id="precios" className="scroll-mt-24 space-y-2 rounded-lg border border-border bg-background p-4">
        <h2 className="text-sm font-semibold text-foreground">Precios y PMP</h2>
        <p className="text-sm">
          PMP:{" "}
          <span className="tabular-nums font-medium">
            {variant.pmp != null && Number.isFinite(variant.pmp) ? formatMoney(variant.pmp, "CLP") : "—"}
          </span>
        </p>
        {variant.priceListItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin precios por lista.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {variant.priceListItems.map((p) => (
              <li key={p.priceListId} className="flex flex-col gap-0.5 px-3 py-2 text-sm">
                <span className="font-medium">{p.priceListName}</span>
                <span className="tabular-nums text-muted-foreground">
                  Neto {formatMoney(p.netPrice, p.currency)} · Bruto {formatMoney(p.grossPrice, p.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="inventario" className="scroll-mt-24 space-y-2 rounded-lg border border-border bg-background p-4">
        <h2 className="text-sm font-semibold text-foreground">Inventario</h2>
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          <li>{variant.trackInventory !== false ? "Stock rastreado" : "Sin rastreo de stock"}</li>
          <li>{variant.allowNegativeStock ? "Permite stock negativo" : "No permite stock negativo"}</li>
          {variant.minimumStock != null ? <li>Mínimo (variante): {variant.minimumStock}</li> : null}
          {variant.maximumStock != null ? <li>Máximo (variante): {variant.maximumStock}</li> : null}
          {variant.reorderPoint != null ? <li>Punto de reposición: {variant.reorderPoint}</li> : null}
          {variant.weight != null && Number.isFinite(Number(variant.weight)) ? (
            <li>
              Peso referencia: {formatNumber(Number(variant.weight))} {(variant.weightUnit ?? "kg").trim()}
            </li>
          ) : null}
        </ul>
      </section>

      <section id="despacho" className="scroll-mt-24 space-y-3 rounded-lg border border-border bg-background p-4">
        <h2 className="text-sm font-semibold text-foreground">Despacho para transportista</h2>
        <p className="text-xs text-muted-foreground">
          Peso neto (producto), peso bruto (con embalaje), dimensiones del empaque en centímetros y divisor K para peso
          volumétrico kg = (L×W×H)/K.
        </p>
        {logisticsError ? (
          <Alert variant="error" data-test-id="pv-detail-logistics-error">
            {logisticsError}
          </Alert>
        ) : null}
        {logisticsOk ? (
          <Alert variant="success" data-test-id="pv-detail-logistics-ok">
            {logisticsOk}
          </Alert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Peso neto (kg)" name="pv-net-kg" value={netKg} onChange={(e) => setNetKg(e.target.value)} placeholder="Ej: 0.25" />
          <TextField
            label="Peso bruto con embalaje (kg)"
            name="pv-gross-kg"
            value={grossKg}
            onChange={(e) => setGrossKg(e.target.value)}
            placeholder="Ej: 0.31"
          />
          <TextField label="Largo empaque (cm)" name="pv-l" value={lenCm} onChange={(e) => setLenCm(e.target.value)} />
          <TextField label="Ancho empaque (cm)" name="pv-w" value={widCm} onChange={(e) => setWidCm(e.target.value)} />
          <TextField label="Alto empaque (cm)" name="pv-h" value={heiCm} onChange={(e) => setHeiCm(e.target.value)} />
          <TextField
            label="Divisor K (volumétrico)"
            name="pv-k"
            value={divK}
            onChange={(e) => setDivK(e.target.value)}
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
        <Button variant="primary" size="sm" type="button" disabled={logisticsPending} onClick={saveLogistics} data-test-id="pv-detail-logistics-save">
          Guardar despacho
        </Button>
      </section>

      <section id="multimedia" className="scroll-mt-24 space-y-2 rounded-lg border border-border bg-background p-4">
        <h2 className="text-sm font-semibold text-foreground">Multimedia</h2>
        <EntityMultimediaPanel
          entityType="product-variant"
          entityId={variant.id}
          title="Imágenes de la variante"
          collectionOnly
          onChanged={() => router.refresh()}
        />
      </section>

      {showRecipe ? (
        <section id="receta" className="scroll-mt-24 space-y-2 rounded-lg border border-border bg-background p-4">
          <h2 className="text-sm font-semibold text-foreground">Receta (BOM)</h2>
          <p className="text-sm text-muted-foreground">Defina insumos por unidad de este SKU.</p>
          <Button variant="outlined" size="sm" type="button" onClick={() => setBomOpen(true)}>
            Abrir editor de receta
          </Button>
        </section>
      ) : null}

      <EditProductVariantDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        product={productRow}
        variant={variant}
        productType={product.productType ?? "PHYSICAL"}
        onSuccess={async () => {
          setEditOpen(false);
          await router.refresh();
        }}
      />
      <CreateRecipeDialog
        open={bomOpen}
        onClose={() => setBomOpen(false)}
        outputVariantId={variant.id}
        outputSku={variant.sku}
        productName={product.name}
        productType={pt === "SERVICE" ? "SERVICE" : "PHYSICAL"}
        onSuccess={async () => {
          setBomOpen(false);
          await router.refresh();
        }}
      />
    </div>
  );
}
