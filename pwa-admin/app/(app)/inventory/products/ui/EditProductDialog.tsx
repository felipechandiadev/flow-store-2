"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Switch from "@/shared/components/Switch/Switch";
import { Select, type Option } from "@/shared/components/Select";
import { updateProductAction } from "@/features/inventory-products/actions/product.action";
import type { ProductGridRow } from "@/features/inventory-products/types/product-grid.types";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { EntityMultimediaPanel } from "./EntityMultimediaPanel";

export type EditProductDialogProps = {
  open: boolean;
  product: ProductGridRow | null;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function EditProductDialog({ open, product, onClose, onSuccess }: EditProductDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [productType, setProductType] = useState<"PHYSICAL" | "SERVICE" | "DIGITAL">("PHYSICAL");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !product) {
      return;
    }
    setName(product.name);
    setBrand(product.brand ?? "");
    setDescription(product.description ?? "");
    setCategoryId(product.categoryId);
    setIsActive(product.isActive !== false);
    setProductType(((product.productType as string) || "PHYSICAL") as any);
    setError(null);
  }, [open, product]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const list = await listCategoriesForPage();
      if (cancelled) {
        return;
      }
      setCategoryOptions(list.map((c) => ({ id: c.id, label: c.name })));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!product) {
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateProductAction({
          id: product.id,
          name: name.trim(),
          brand: brand.trim() || undefined,
          description: description.trim() || undefined,
          categoryId: categoryId?.trim() || undefined,
          productType,
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

  const canSubmit = name.trim().length > 0 && !isPending && product != null;

  return (
    <Dialog
      open={open && product != null}
      onClose={handleClose}
      title="Editar producto"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="product-edit-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="product-edit-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="product-edit-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="product-edit-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="product-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="product-edit-name"
        />
        <Select
          label="Tipo"
          name="product-edit-type"
          placeholder="Seleccione tipo"
          options={[
            { id: "PHYSICAL", label: "Producto físico" },
            { id: "SERVICE", label: "Servicio" },
            { id: "DIGITAL", label: "Digital" },
          ]}
          value={productType}
          onChange={(id) => setProductType((id == null ? "PHYSICAL" : String(id)) as any)}
          data-test-id="product-edit-type"
        />
        {productType === "SERVICE" ? (
          <div className="rounded-lg border border-border bg-muted/15 p-3 text-xs text-muted-foreground">
            Este producto es un <span className="font-medium text-foreground">servicio</span>. Si consume insumos, defina
            la <span className="font-medium text-foreground">receta (BOM)</span> en{" "}
            <span className="font-medium text-foreground">Inventario → Productos</span>: expanda el producto, elija la
            variante y use <span className="font-medium text-foreground">Receta (BOM)</span>.
          </div>
        ) : null}
        <Select
          label="Categoría"
          name="product-edit-category"
          placeholder="Sin categoría"
          options={categoryOptions}
          value={categoryId}
          onChange={(id) => setCategoryId(id == null ? null : String(id))}
          allowClear
          data-test-id="product-edit-category"
        />
        <TextField
          label="Marca"
          name="product-edit-brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Marca"
          data-test-id="product-edit-brand"
        />
        <TextField
          label="Descripción"
          name="product-edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          data-test-id="product-edit-description"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="product-edit-active"
          />
        </div>
        {product ? (
          <EntityMultimediaPanel
            entityType="product"
            entityId={product.id}
            title="Imágenes del producto (catálogo)"
            onChanged={() => router.refresh()}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
