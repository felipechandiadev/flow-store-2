"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Barcode } from "lucide-react";
import DataGrid from "@/shared/components/DataGrid/DataGrid";
import type { DataGridColumn } from "@/shared/components/DataGrid/DataGrid";
import IconButton from "@/shared/components/IconButton/IconButton";
import Badge from "@/shared/components/Badge/Badge";
import { DeleteDialog } from "@/shared/components/Dialog/DeleteDialog";
import type { ProductGridRow, ProductVariantGridRow } from "@/features/inventory-products/types/product-grid.types";
import { Button } from "@/shared/components/Button";
import { CreateProductDialog } from "./CreateProductDialog";
import { EditProductDialog } from "./EditProductDialog";
import { CreateProductVariantDialog } from "./CreateProductVariantDialog";
import { deleteProductAction, deleteProductVariantAction } from "@/features/inventory-products/actions/product.action";

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

function productTypePresentation(pt: string | null | undefined): { label: string; variant: "primary" | "warning" | "info" } {
  const t = (pt ?? "PHYSICAL").toString().toUpperCase();
  if (t === "SERVICE") {
    return { label: "Servicio", variant: "warning" };
  }
  if (t === "DIGITAL") {
    return { label: "Digital", variant: "info" };
  }
  return { label: "Físico", variant: "primary" };
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

function ProductVariantExpandCard({
  v,
  product,
  onOpenVariant,
  onDelete,
}: {
  v: ProductVariantGridRow;
  product: ProductGridRow;
  onOpenVariant: (variantId: string) => void;
  onDelete?: () => void;
}) {
  const title = variantTitle(v);

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-muted/15 px-2 py-1.5"
      data-test-id={`products-expand-variant-row-${v.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="min-w-0 truncate font-medium text-foreground" title={title}>
            {title}
          </span>
          <span className="shrink-0 font-mono text-muted-foreground" title={v.sku}>
            {v.sku}
          </span>
          {v.isActive === false ? (
            <Badge variant="secondary-outlined" className="shrink-0 text-[10px]">
              Inactiva
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          Producto:{" "}
          <span className="font-medium text-foreground" title={product.name}>
            {product.name}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          icon="ExternalLink"
          variant="basicSecondary"
          size="sm"
          ariaLabel="Abrir ficha de variante"
          title="Ficha de variante"
          onClick={(e) => {
            e.stopPropagation();
            onOpenVariant(v.id);
          }}
          data-test-id={`products-expand-variant-open-${v.id}`}
        />
        {onDelete ? (
          <IconButton
            icon="Trash2"
            variant="basicSecondary"
            size="sm"
            ariaLabel="Eliminar variante"
            title="Eliminar variante"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            data-test-id={`products-expand-variant-delete-${v.id}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function ProductExpandPanel({
  row,
  onAddVariant,
  onOpenVariant,
  onDeleteVariant,
}: {
  row: ProductGridRow;
  onAddVariant: (r: ProductGridRow) => void;
  onOpenVariant: (variantId: string) => void;
  onDeleteVariant?: (product: ProductGridRow, variant: ProductVariantGridRow) => void;
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
          className="flex w-full min-w-0 flex-col gap-1.5"
          data-test-id="products-expand-variant-cards"
        >
          {row.variants!.map((v) => (
            <ProductVariantExpandCard
              key={v.id}
              v={v}
              product={row}
              onOpenVariant={onOpenVariant}
              onDelete={onDeleteVariant ? () => onDeleteVariant(row, v) : undefined}
            />
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
              Después podrá definir la <span className="font-medium text-foreground">receta (BOM)</span> en esa variante
              (producto físico o servicio).
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
  const [editRow, setEditRow] = useState<ProductGridRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ProductGridRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [variantDialog, setVariantDialog] = useState<{
    productId: string;
    productName: string;
    productType?: string | null;
    referencePmp: number;
  } | null>(null);
  const [deleteVariantTarget, setDeleteVariantTarget] = useState<{
    product: ProductGridRow;
    variant: ProductVariantGridRow;
  } | null>(null);
  const [deleteVariantError, setDeleteVariantError] = useState<string | null>(null);
  const [isDeleteVariantPending, startDeleteVariantTransition] = useTransition();

  const openVariantDialog = useCallback((r: ProductGridRow) => {
    setVariantDialog({
      productId: r.id,
      productName: r.name,
      productType: r.productType ?? "PHYSICAL",
      referencePmp: averageReferencePmp(r),
    });
  }, []);

  const onOpenVariantPage = useCallback(
    (variantId: string) => {
      const id = variantId?.trim();
      if (!id) {
        return;
      }
      router.push(`/inventory/products/variants/${encodeURIComponent(id)}`);
    },
    [router],
  );

  const onEditProduct = useCallback((r: ProductGridRow) => {
    setEditRow(r);
  }, []);

  const onDeleteProduct = useCallback((r: ProductGridRow) => {
    setDeleteError(null);
    setDeleteRow(r);
  }, []);

  const columns: DataGridColumn[] = useMemo(() => {
    function ProductActionsCell({ row, column: _column }: { row: any; column: DataGridColumn }) {
      const r = row as ProductGridRow;
      return (
        <div
          className="flex items-center justify-center gap-1"
          data-test-id={`products-row-actions-${r.id}`}
        >
          <IconButton
            icon="Pencil"
            variant="basicSecondary"
            size="sm"
            title="Editar"
            ariaLabel="Editar producto"
            onClick={() => onEditProduct(r)}
            data-test-id={`products-row-edit-${r.id}`}
          />
          <IconButton
            icon="Trash2"
            variant="basicSecondary"
            size="sm"
            title="Eliminar"
            ariaLabel="Eliminar producto"
            onClick={() => onDeleteProduct(r)}
            data-test-id={`products-row-delete-${r.id}`}
          />
        </div>
      );
    }

    return [
      { field: "name", headerName: "Nombre", sortable: true, minWidth: 200, flex: 1 },
      {
        field: "productType",
        headerName: "Tipo",
        sortable: true,
        width: 116,
        renderCell: ({ row }) => {
          const r = row as ProductGridRow;
          const p = productTypePresentation(r.productType);
          return (
            <Badge variant={p.variant} className="shrink-0">
              {p.label}
            </Badge>
          );
        },
      },
      {
        field: "categoryName",
        headerName: "Categoría",
        sortable: true,
        width: 160,
        renderCell: ({ row }) => {
          const name = (row as ProductGridRow).categoryName?.trim();
          return <span className="text-foreground">{name ? name : "—"}</span>;
        },
      },
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
      {
        field: "actions",
        headerName: "",
        width: 96,
        minWidth: 96,
        align: "center",
        sortable: false,
        filterable: false,
        actionComponent: ProductActionsCell,
      },
    ];
  }, [onEditProduct, onDeleteProduct]);

  const onDeleteVariantClick = useCallback((product: ProductGridRow, variant: ProductVariantGridRow) => {
    setDeleteVariantError(null);
    setDeleteVariantTarget({ product, variant });
  }, []);

  const expandableRowContent = useCallback(
    (row: ProductGridRow) => (
      <ProductExpandPanel
        row={row}
        onAddVariant={openVariantDialog}
        onOpenVariant={onOpenVariantPage}
        onDeleteVariant={onDeleteVariantClick}
      />
    ),
    [onDeleteVariantClick, onOpenVariantPage, openVariantDialog],
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
        pinActionsColumn
        actionsColumnField="actions"
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
      <EditProductDialog
        open={editRow != null}
        product={editRow}
        onClose={() => setEditRow(null)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <DeleteDialog
        open={deleteRow != null}
        onClose={() => {
          if (!isDeletePending) {
            setDeleteRow(null);
            setDeleteError(null);
          }
        }}
        title="Eliminar producto"
        message={
          deleteRow ? (
            <>
              ¿Eliminar el producto <strong className="font-semibold">«{deleteRow.name}»</strong>? Esta acción no se puede
              deshacer.
            </>
          ) : null
        }
        errors={deleteError ? [deleteError] : []}
        isSubmitting={isDeletePending}
        onConfirm={() => {
          if (!deleteRow) {
            return;
          }
          setDeleteError(null);
          startDeleteTransition(() => {
            void (async () => {
              const r = await deleteProductAction(deleteRow.id);
              if (r.success) {
                setDeleteRow(null);
                await router.refresh();
              } else {
                setDeleteError(r.error);
              }
            })();
          });
        }}
        data-test-id="product-delete-dialog"
      />
      <DeleteDialog
        open={deleteVariantTarget != null}
        onClose={() => {
          if (!isDeleteVariantPending) {
            setDeleteVariantTarget(null);
            setDeleteVariantError(null);
          }
        }}
        title="Eliminar variante"
        message={
          deleteVariantTarget ? (
            <>
              ¿Eliminar la variante <strong className="font-semibold">«{deleteVariantTarget.variant.sku}»</strong> del
              producto <strong className="font-semibold">«{deleteVariantTarget.product.name}»</strong>? Esta acción no se
              puede deshacer.
            </>
          ) : null
        }
        errors={deleteVariantError ? [deleteVariantError] : []}
        isSubmitting={isDeleteVariantPending}
        onConfirm={() => {
          if (!deleteVariantTarget) {
            return;
          }
          setDeleteVariantError(null);
          startDeleteVariantTransition(() => {
            void (async () => {
              const id = deleteVariantTarget.variant.id;
              const r = await deleteProductVariantAction(id);
              if (r.success) {
                setDeleteVariantTarget(null);
                await router.refresh();
              } else {
                setDeleteVariantError(r.error);
              }
            })();
          });
        }}
        data-test-id="product-variant-delete-dialog"
      />
      <CreateProductVariantDialog
        open={variantDialog != null}
        onClose={() => setVariantDialog(null)}
        productId={variantDialog?.productId ?? ""}
        productName={variantDialog?.productName ?? ""}
        productType={(variantDialog as any)?.productType ?? "PHYSICAL"}
        referencePmp={variantDialog?.referencePmp ?? 0}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
