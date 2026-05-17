"use client";

import { useEffect, useState, useTransition } from "react";
import { Alert, Button, Dialog, TextField } from "@/shared";
import { createQuickProductAction } from "@/features/product/actions/product.action";
import type { ScanMode } from "../domain/scan-mode.entity";

export type QuickCreateProductDialogProps = {
  open: boolean;
  scannedCode: string;
  mode: ScanMode;
  onClose: () => void;
  onCreated: (variantId: string, sku: string) => void;
};

export default function QuickCreateProductDialog({
  open,
  scannedCode,
  mode,
  onClose,
  onCreated,
}: QuickCreateProductDialogProps) {
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [baseCost, setBaseCost] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const codeLabel = mode === "sku" ? "SKU" : "Código de barras";

  useEffect(() => {
    if (!open) return;
    setProductName("");
    setSku(mode === "sku" ? scannedCode : "");
    setBasePrice("");
    setBaseCost("");
    setError("");
  }, [open, scannedCode, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const r = await createQuickProductAction({
        productName,
        scannedCode,
        mode,
        sku: sku.trim() || undefined,
        basePrice: basePrice.trim() ? Number(basePrice.replace(/\D/g, "")) : 0,
        baseCost: baseCost.trim() ? Number(baseCost.replace(/\D/g, "")) : 0,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      onCreated(r.variantId, r.sku);
      onClose();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Crear producto"
      size="sm"
      scroll="paper"
      disableBackdropClick={pending}
      persistent={pending}
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="quick-create-product-form" loading={pending} disabled={pending}>
            Crear
          </Button>
        </>
      }
    >
      <form id="quick-create-product-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          No existe una variante con este código. Completa los datos mínimos para registrar el producto.
        </p>
        <TextField
          label={codeLabel}
          placeholder={codeLabel}
          value={scannedCode}
          onChange={() => {}}
          disabled
          readOnly
        />
        <TextField
          label="Nombre del producto"
          placeholder="Nombre del producto"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          disabled={pending}
          required
        />
        <TextField
          label="SKU"
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          disabled={pending || mode === "sku"}
        />
        <TextField
          label="Precio de venta (CLP)"
          placeholder="Precio de venta (CLP)"
          inputMode="numeric"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value.replace(/\D/g, ""))}
          disabled={pending}
        />
        <TextField
          label="Costo / PMP (CLP)"
          placeholder="Costo / PMP (CLP)"
          inputMode="numeric"
          value={baseCost}
          onChange={(e) => setBaseCost(e.target.value.replace(/\D/g, ""))}
          disabled={pending}
        />
      </form>
    </Dialog>
  );
}
