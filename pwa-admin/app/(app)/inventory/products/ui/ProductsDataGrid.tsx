"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode } from "lucide-react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import IconButton from "@/shared/components/IconButton/IconButton";
import Badge from "@/shared/components/Badge/Badge";
import type { ProductGridRow, ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { CreateProductDialog } from "./CreateProductDialog";
import { CreateProductVariantDialog } from "./CreateProductVariantDialog";

type ProductsDataGridProps = {
  rows: ProductGridRow[];
  total: number;
};

function averageReferencePmp(row: ProductGridRow): number {
  const positives = (row.variants ?? [])
    .map((v) => (typeof v.pmp === "number" && Number.isFinite(v.pmp) ? v.pmp : 0))
    .filter((n) => n > 0);
  if (positives.length === 0) {
    return 0;
  }
  return Math.round(positives.reduce((a, b) => a + b, 0) / positives.length);
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: currency || "CLP" }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(n);
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

function ProductVariantExpandCard({ v }: { v: ProductVariantGridRow }) {
  const img = v.primaryImageUrl?.trim() || null;
  const extraMedia = (v.mediaAssets?.length ?? 0) > 1 ? (v.mediaAssets!.length - 1) : 0;
  const weightLine =
    v.weight != null && Number.isFinite(v.weight)
      ? `${formatNumber(v.weight)} ${(v.weightUnit ?? "kg").trim()}`
      : null;
  const track = v.trackInventory !== false;
  const neg = v.allowNegativeStock === true;

  return (
    <article
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm"
      data-test-id={`products-expand-variant-card-${v.id}`}
    >
      {img ? (
        <div className="relative aspect-[16/9] w-full shrink-0 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
          {extraMedia > 0 ? (
            <span className="absolute bottom-2 right-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow">
              +{extraMedia} {extraMedia === 1 ? "imagen" : "imágenes"}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-base font-semibold leading-snug text-foreground" title={variantTitle(v)}>
              {variantTitle(v)}
            </h4>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground" title={v.sku}>
              SKU: {v.sku}
            </p>
          </div>
          <Badge variant={v.isActive !== false ? "success" : "secondary-outlined"} className="shrink-0">
            {v.isActive !== false ? "Activa" : "Inactiva"}
          </Badge>
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <dt className="font-medium text-muted-foreground">Código de barras</dt>
            <dd className="mt-0.5 font-mono text-foreground">{v.barcode?.trim() ? v.barcode : "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="font-medium text-muted-foreground">Unidad</dt>
            <dd className="mt-0.5 text-foreground">{v.unitOfMeasure?.trim() ? v.unitOfMeasure : "—"}</dd>
          </div>
          {weightLine ? (
            <div className="min-w-0">
              <dt className="font-medium text-muted-foreground">Peso</dt>
              <dd className="mt-0.5 tabular-nums text-foreground">{weightLine}</dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="font-medium text-muted-foreground">PMP</dt>
            <dd className="mt-0.5 tabular-nums text-foreground">
              {v.pmp != null && Number.isFinite(v.pmp) ? formatMoney(v.pmp, "CLP") : "—"}
            </dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="font-medium text-muted-foreground">Inventario</dt>
            <dd className="mt-0.5 text-foreground">
              {track ? "Rastreado" : "Sin rastreo"}
              {track ? (
                <>
                  {" · "}
                  {neg ? "Permite stock negativo" : "No permite stock negativo"}
                </>
              ) : null}
            </dd>
          </div>
        </dl>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Precios por lista
          </p>
          {v.priceListItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin precios por lista.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {v.priceListItems.map((p) => (
                <li
                  key={p.priceListId}
                  className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2 text-xs"
                  data-test-id={`products-expand-pl-${v.id}-${p.priceListId}`}
                >
                  <p className="font-medium text-foreground">{p.priceListName}</p>
                  <p className="mt-1 tabular-nums text-muted-foreground">
                    Neto: <span className="text-foreground">{formatMoney(p.netPrice, p.currency)}</span>
                    {" · "}
                    Bruto: <span className="text-foreground">{formatMoney(p.grossPrice, p.currency)}</span>
                  </p>
                  {p.taxIds && p.taxIds.length > 0 ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {p.taxIds.length} impuesto{p.taxIds.length === 1 ? "" : "s"} en esta lista
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductExpandPanel({
  row,
  onAddVariant,
}: {
  row: ProductGridRow;
  onAddVariant: (r: ProductGridRow) => void;
}) {
  const hasVariants = Boolean(row.variants?.length);

  return (
    <div className="relative w-full min-w-0 max-w-none" data-test-id="products-expand-panel">
      <div className="mb-3 flex w-full min-w-0 items-center gap-2">
        <IconButton
          icon="Plus"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Agregar variante"
          title="Agregar variante"
          onClick={() => onAddVariant(row)}
          data-test-id="products-expand-add-variant"
        />
        <h3 className="text-sm font-semibold text-foreground">Variantes</h3>
      </div>

      {hasVariants ? (
        <div
          className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          data-test-id="products-expand-variant-cards"
        >
          {row.variants!.map((v) => (
            <ProductVariantExpandCard key={v.id} v={v} />
          ))}
        </div>
      ) : (
        <div
          className="relative w-full min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/[0.06] via-background to-neutral/25 px-6 py-10"
          data-test-id="products-expand-empty-variants"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-secondary/20 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex min-h-[9rem] flex-col items-center justify-center gap-3 text-center">
            <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
              <Barcode className="h-9 w-9 text-primary" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="text-sm font-semibold text-foreground">Sin variantes</p>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              Este producto aún no tiene variantes (SKU, precios e inventario viven en cada variante). Use el botón{" "}
              <span className="font-medium text-foreground">+</span> junto al título «Variantes» para crear la primera.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsDataGrid({ rows, total }: ProductsDataGridProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [variantDialog, setVariantDialog] = useState<{
    productId: string;
    productName: string;
    referencePmp: number;
  } | null>(null);

  const openVariantDialog = useCallback((r: ProductGridRow) => {
    setVariantDialog({
      productId: r.id,
      productName: r.name,
      referencePmp: averageReferencePmp(r),
    });
  }, []);

  const columns: DataGridColumn[] = useMemo(
    () => [
      { field: "name", headerName: "Nombre", sortable: true, minWidth: 200, flex: 1 },
      { field: "brand", headerName: "Marca", sortable: true, width: 160 },
      {
        field: "variantCount",
        headerName: "Variantes",
        sortable: true,
        width: 110,
        align: "right",
      },
      {
        field: "isActive",
        headerName: "Activo",
        width: 100,
        sortable: true,
        renderCell: ({ value }) => (
          <span className={value ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
            {value ? "Sí" : "No"}
          </span>
        ),
      },
    ],
    [],
  );

  const expandableRowContent = useCallback(
    (row: ProductGridRow) => <ProductExpandPanel row={row} onAddVariant={openVariantDialog} />,
    [openVariantDialog],
  );

  return (
    <>
      <DataGrid
        title="Productos"
        columns={columns}
        rows={rows}
        totalRows={total}
        totalGeneral={total}
        height="85vh"
        showExportButton={false}
        expandable
        expandableRowContent={(row) => expandableRowContent(row as ProductGridRow)}
        onAddClick={() => setCreateOpen(true)}
        data-test-id="products-data-grid"
      />
      <CreateProductDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <CreateProductVariantDialog
        open={variantDialog != null}
        onClose={() => setVariantDialog(null)}
        productId={variantDialog?.productId ?? ""}
        productName={variantDialog?.productName ?? ""}
        referencePmp={variantDialog?.referencePmp ?? 0}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
