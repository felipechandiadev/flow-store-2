"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Switch from "@/shared/components/Switch/Switch";
import { Select, type Option } from "@/shared/components/Select";
import { createProductAction } from "@/features/inventory-products/actions/product.action";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { EntityMultimediaPanel } from "./EntityMultimediaPanel";

export type CreateProductDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

export function CreateProductDialog({ open, onClose, onSuccess }: CreateProductDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"form" | "media">("form");
  const [newProductId, setNewProductId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [productType, setProductType] = useState<"PHYSICAL" | "SERVICE" | "DIGITAL">("PHYSICAL");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setPhase("form");
    setNewProductId(null);
    setName("");
    setBrand("");
    setDescription("");
    setCategoryId(null);
    setProductType("PHYSICAL");
    setIsActive(true);
    setError(null);
  }, [open]);

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
    setPhase("form");
    setNewProductId(null);
    setName("");
    setBrand("");
    setDescription("");
    setCategoryId(null);
    setProductType("PHYSICAL");
    setIsActive(true);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (phase !== "form") {
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createProductAction({
          name: name.trim(),
          categoryId: categoryId?.trim() || undefined,
          brand: brand.trim() || undefined,
          description: description.trim() || undefined,
          productType,
          isActive,
        });
        if (r.success) {
          setNewProductId(r.id);
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

  const canSubmit = phase === "form" && name.trim().length > 0 && !isPending;
  const canFinalize = phase === "media" && !isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={phase === "media" ? "Imágenes del producto" : "Crear producto"}
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="product-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="product-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        phase === "media" ? (
          <>
            <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="product-create-cancel">
              Cerrar
            </Button>
            <Button variant="primary" size="md" onClick={handleFinalizeMedia} disabled={!canFinalize} data-test-id="product-create-finish-media">
              Listo
            </Button>
          </>
        ) : (
          <>
            <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="product-create-cancel">
              Cancelar
            </Button>
            <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="product-create-submit">
              Crear
            </Button>
          </>
        )
      }
    >
      {phase === "media" && newProductId ? (
        <div className="flex w-full min-w-0 flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Producto creado. Puede añadir imágenes de catálogo a nivel <span className="font-medium text-foreground">producto</span>{" "}
            (compartidas por todas las variantes si no tienen imagen propia).
          </p>
          <EntityMultimediaPanel
            entityType="product"
            entityId={newProductId}
            title="Imágenes del producto"
            onChanged={() => router.refresh()}
          />
        </div>
      ) : (
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="product-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="product-create-name"
        />
        <Select
          label="Tipo"
          name="product-create-type"
          placeholder="Seleccione tipo"
          options={[
            { id: "PHYSICAL", label: "Producto físico" },
            { id: "SERVICE", label: "Servicio" },
            { id: "DIGITAL", label: "Digital" },
          ]}
          value={productType}
          onChange={(id) => setProductType((id == null ? "PHYSICAL" : String(id)) as any)}
          data-test-id="product-create-type"
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
          name="product-create-category"
          placeholder="Sin categoría"
          options={categoryOptions}
          value={categoryId}
          onChange={(id) => setCategoryId(id == null ? null : String(id))}
          allowClear
          data-test-id="product-create-category"
        />
        <TextField
          label="Marca"
          name="product-create-brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Marca"
          data-test-id="product-create-brand"
        />
        <TextField
          label="Descripción"
          name="product-create-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          data-test-id="product-create-description"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="product-create-active"
          />
        </div>
      </div>
      )}
    </Dialog>
  );
}
