"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode } from "lucide-react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import IconButton from "@/shared/components/IconButton/IconButton";
import type { ProductGridRow, ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { CreateProductDialog } from "./CreateProductDialog";
import { CreateProductVariantDialog } from "./CreateProductVariantDialog";

type ProductsDataGridProps = {
  rows: ProductGridRow[];
  total: number;
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: currency || "CLP" }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function priceListsCell(v: ProductVariantGridRow): string {
  if (!v.priceListItems.length) {
    return "—";
  }
  return v.priceListItems
    .map((p) => `${p.priceListName}: ${formatMoney(p.netPrice, p.currency)}`)
    .join(" · ");
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
        <div className="w-full min-w-0 overflow-x-auto rounded-md bg-muted/20">
          <table className="w-full min-w-0 table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                <th className="w-[14%] px-3 py-2 font-medium">SKU</th>
                <th className="w-[14%] px-3 py-2 font-medium">Código de barras</th>
                <th className="w-[10%] px-3 py-2 font-medium">Unidad</th>
                <th className="w-[12%] px-3 py-2 text-right font-medium">Precio base</th>
                <th className="w-[42%] px-3 py-2 font-medium">Precios por lista</th>
                <th className="w-[8%] px-3 py-2 font-medium">Activo</th>
              </tr>
            </thead>
            <tbody>
              {row.variants!.map((v) => (
                <tr key={v.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{v.sku}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{v.barcode ?? "—"}</td>
                  <td className="px-3 py-2 text-foreground">{v.unitOfMeasure ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {v.basePrice != null && Number.isFinite(v.basePrice) ? formatMoney(v.basePrice, "CLP") : "—"}
                  </td>
                  <td className="min-w-0 break-words px-3 py-2 text-xs leading-snug text-foreground">
                    {priceListsCell(v)}
                  </td>
                  <td className="px-3 py-2 text-foreground">{v.isActive !== false ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [variantDialog, setVariantDialog] = useState<{ productId: string; productName: string } | null>(null);

  const openVariantDialog = useCallback((r: ProductGridRow) => {
    setVariantDialog({ productId: r.id, productName: r.name });
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
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
