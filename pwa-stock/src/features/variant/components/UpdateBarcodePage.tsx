"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, TextField } from "@/shared";
import BarcodeScanner from "./BarcodeScanner";
import { updateBarcodeAction } from "../actions/variant.action";

export default function UpdateBarcodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId")?.trim() || "";
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSave = useCallback(() => {
    if (!variantId) {
      setError("Variante no indicada");
      return;
    }
    setError("");
    startTransition(async () => {
      const r = await updateBarcodeAction({ variantId, barcode });
      if (!r.success) {
        setError(r.error);
        return;
      }
      router.push(`/variant?variantId=${encodeURIComponent(variantId)}`);
      router.refresh();
    });
  }, [barcode, router, variantId]);

  if (!variantId) {
    return <Alert variant="error">Falta el identificador de variante.</Alert>;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <h1 className="text-lg font-semibold">Actualizar código de barras</h1>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <BarcodeScanner
        onScan={(code) => {
          setBarcode(code);
        }}
        paused={pending}
      />
      <TextField
        label="Código de barras"
        placeholder="Código de barras"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        disabled={pending}
      />
      <Button type="button" onClick={handleSave} loading={pending} disabled={pending}>
        Guardar Nuevo Código
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => router.push(`/variant?variantId=${encodeURIComponent(variantId)}`)}
        disabled={pending}
      >
        Volver
      </Button>
    </div>
  );
}
