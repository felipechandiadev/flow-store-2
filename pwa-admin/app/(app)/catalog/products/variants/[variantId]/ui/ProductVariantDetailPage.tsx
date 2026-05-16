"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/shared/components/Alert/Alert";
import Badge from "@/shared/components/Badge/Badge";
import { TextField } from "@/shared/components/TextField/TextField";
import type { ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import {
  updateProductVariantLogisticsAction,
} from "@/features/inventory-products/actions/product.action";
import { CreateRecipeDialog } from "../../../ui/CreateRecipeDialog";
import { EntityMultimediaPanel } from "../../../ui/EntityMultimediaPanel";
import { catalogProductTypeAllowsRecipeBom, normalizeCatalogProductType } from "../../../ui/catalog-product-type-options";
import IconButton from "@/shared/components/IconButton/IconButton";
import {
  VariantDetailIdentitySection,
  VariantDetailInventorySection,
  VariantDetailPricingSection,
} from "./VariantDetailPageSections";

function noop() {}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 6 }).format(n);
}

function variantAttributeValueBadges(v: ProductVariantGridRow): Array<{ key: string; value: string }> {
  const raw = v.attributeValues;
  if (!raw || typeof raw !== "object") {
    return [];
  }
  return Object.entries(raw)
    .map(([key, val]) => ({ key, value: val != null ? String(val).trim() : "" }))
    .filter((x) => x.value.length > 0);
}

type Props = {
  product: {
    id: string;
    name: string;
    productType: string | null;
    categoryName?: string | null;
    brand?: string | null;
  };
  variant: ProductVariantGridRow;
};

export default function ProductVariantDetailPage({ product, variant: initialVariant }: Props) {
  const router = useRouter();
  const [variant, setVariant] = useState(initialVariant);
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
  const [logisticsEditing, setLogisticsEditing] = useState(false);

  useEffect(() => {
    setVariant(initialVariant);
  }, [initialVariant]);

  useEffect(() => {
    if (logisticsEditing) {
      return;
    }
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
  }, [variant, logisticsEditing]);

  const showRecipe = catalogProductTypeAllowsRecipeBom(product.productType);

  const headerAttributeBadges = useMemo(() => variantAttributeValueBadges(variant), [variant]);

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
          setLogisticsEditing(false);
          await router.refresh();
        } else {
          setLogisticsError(r.error);
        }
      })();
    });
  }, [variant.id, netKg, grossKg, lenCm, widCm, heiCm, divK, router]);

  const logisticsRo = !logisticsEditing;

  const toggleLogisticsEditOrSave = () => {
    setLogisticsError(null);
    setLogisticsOk(null);
    if (!logisticsEditing) {
      setLogisticsEditing(true);
      return;
    }
    saveLogistics();
  };

  /** Misma apariencia que `<Button variant="text" size="sm" />` (enlaces ancla no pueden ser `<button>`). */
  const sectionNavClass =
    "fs-button fs-button--text px-3 py-1.5 text-sm no-underline";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-16" data-test-id="product-variant-detail-root">
      <header className="border-b border-border pb-4" data-test-id="product-variant-detail-header">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-2">
          <h1
            className="min-w-0 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            title={product.name}
          >
            {product.name}
          </h1>
          {headerAttributeBadges.length > 0 ? (
            <div
              className="flex min-w-0 flex-wrap items-center gap-1.5"
              data-test-id="product-variant-detail-header-attrs"
            >
              {headerAttributeBadges.map(({ key, value }) => (
                <Badge
                  key={key}
                  variant="secondary-outlined"
                  className="max-w-full shrink-0 truncate text-xs font-normal sm:text-sm"
                >
                  {value}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-3 font-mono text-sm text-muted-foreground" data-test-id="product-variant-detail-sku">
          {variant.sku}
        </p>
        {variant.barcode?.trim() ? (
          <p className="mt-1 text-xs text-muted-foreground" data-test-id="product-variant-detail-barcode">
            Código de barras: {variant.barcode.trim()}
          </p>
        ) : null}
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

      <VariantDetailIdentitySection
        productId={product.id}
        productType={product.productType}
        variant={variant}
        productCategoryName={product.categoryName}
        productBrand={product.brand}
      />
      <VariantDetailPricingSection productId={product.id} productType={product.productType} variant={variant} />
      <VariantDetailInventorySection productId={product.id} productType={product.productType} variant={variant} />

      <section
        id="despacho"
        className={`scroll-mt-24 relative space-y-3 rounded-lg border border-border bg-background p-4 pb-12 ${
          logisticsEditing ? "ring-1 ring-primary/25" : ""
        }`}
        data-test-id="pv-section-logistics"
      >
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
          <TextField
            label="Peso neto (kg)"
            name="pv-net-kg"
            value={netKg}
            onChange={logisticsRo ? noop : (e) => setNetKg(e.target.value)}
            readOnly={logisticsRo}
            placeholder="Ej: 0.25"
          />
          <TextField
            label="Peso bruto con embalaje (kg)"
            name="pv-gross-kg"
            value={grossKg}
            onChange={logisticsRo ? noop : (e) => setGrossKg(e.target.value)}
            readOnly={logisticsRo}
            placeholder="Ej: 0.31"
          />
          <TextField
            label="Largo empaque (cm)"
            name="pv-l"
            value={lenCm}
            onChange={logisticsRo ? noop : (e) => setLenCm(e.target.value)}
            readOnly={logisticsRo}
          />
          <TextField
            label="Ancho empaque (cm)"
            name="pv-w"
            value={widCm}
            onChange={logisticsRo ? noop : (e) => setWidCm(e.target.value)}
            readOnly={logisticsRo}
          />
          <TextField
            label="Alto empaque (cm)"
            name="pv-h"
            value={heiCm}
            onChange={logisticsRo ? noop : (e) => setHeiCm(e.target.value)}
            readOnly={logisticsRo}
          />
          <TextField
            label="Divisor K (volumétrico)"
            name="pv-k"
            value={divK}
            onChange={logisticsRo ? noop : (e) => setDivK(e.target.value)}
            readOnly={logisticsRo}
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
            icon={logisticsEditing ? "Save" : "Pencil"}
            variant="basicSecondary"
            size="sm"
            ariaLabel={logisticsEditing ? "Guardar despacho" : "Editar despacho"}
            onClick={toggleLogisticsEditOrSave}
            disabled={logisticsPending}
            isLoading={logisticsPending}
            data-test-id="pv-detail-logistics-edit-save"
          />
        </div>
      </section>

      <section id="multimedia" className="scroll-mt-24 space-y-2 rounded-lg border border-border bg-background p-4">
        <h2 className="text-sm font-semibold text-foreground">Multimedia</h2>
        <EntityMultimediaPanel
          entityType="product-variant"
          entityId={variant.id}
          omitHeading
          collectionOnly
          onChanged={() => router.refresh()}
        />
      </section>

      {showRecipe ? (
        <section id="receta" className="scroll-mt-24 space-y-3 rounded-lg border border-border bg-background p-4">
          <div className="flex items-start gap-2">
            <IconButton
              icon="Plus"
              variant="basicSecondary"
              size="sm"
              className="mt-0.5 shrink-0"
              ariaLabel="Nueva receta"
              onClick={() => setBomOpen(true)}
              data-test-id="pv-detail-recipe-add"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Receta (BOM)</h2>
              <p className="mt-1 text-sm text-muted-foreground">Defina insumos por unidad de este SKU.</p>
            </div>
          </div>
        </section>
      ) : null}

      <CreateRecipeDialog
        open={bomOpen}
        onClose={() => setBomOpen(false)}
        outputVariantId={variant.id}
        outputSku={variant.sku}
        productName={product.name}
        productType={normalizeCatalogProductType(product.productType)}
        onSuccess={async () => {
          setBomOpen(false);
          await router.refresh();
        }}
      />
    </div>
  );
}
