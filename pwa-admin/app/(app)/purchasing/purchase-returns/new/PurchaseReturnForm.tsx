"use client";

import { useMemo, useState } from "react";
import TextField from "@/shared/components/TextField";
import { Button } from "@/shared/components/Button";
import type { CreatePurchaseReturnInput } from "@/features/purchasing-purchase-returns/types/purchase-return.types";
import { createPurchaseReturnAction } from "@/features/purchasing-purchase-returns/actions/purchase-return.action";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function PurchaseReturnForm() {
  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [storageId, setStorageId] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => branchId.trim() && supplierId.trim() && storageId.trim() && !busy,
    [branchId, supplierId, storageId, busy],
  );

  async function onSubmit() {
    setError(null);
    setOk(null);
    const t = n(total);
    const input: CreatePurchaseReturnInput = {
      branchId: branchId.trim(),
      supplierId: supplierId.trim(),
      storageId: storageId.trim(),
      subtotal: t,
      taxAmount: 0,
      discountAmount: 0,
      total: t,
      externalReference: externalReference.trim() || null,
      notes: notes.trim() || null,
      lines: [
        {
          quantity: 1,
          unitPrice: t,
          productName: "Devolución a proveedor (resumen)",
          subtotal: t,
          total: t,
          taxAmount: 0,
          taxRate: 0,
        },
      ],
    };
    setBusy(true);
    try {
      const res = await createPurchaseReturnAction(input);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setOk("Devolución creada. Podés usar su id como purchaseReturnId en una nota de crédito.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 max-w-3xl" data-test-id="purchase-returns-new-form">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Nueva devolución</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Crea una transacción <code>PURCHASE_RETURN</code> (versión inicial con línea resumen).
      </p>

      <div className="mt-4 grid gap-3">
        <TextField label="Branch ID (uuid)" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
        <TextField label="Supplier ID (uuid)" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        <TextField label="Storage ID (uuid almacén)" value={storageId} onChange={(e) => setStorageId(e.target.value)} />
        <TextField
          label="Referencia externa"
          value={externalReference}
          onChange={(e) => setExternalReference(e.target.value)}
        />
        <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <TextField label="Total" value={total} onChange={(e) => setTotal(e.target.value || "0")} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {ok ? <p className="text-sm text-green-700">{ok}</p> : null}
        <Button variant="primary" disabled={!canSubmit} loading={busy} onClick={onSubmit}>
          Crear devolución
        </Button>
      </div>
    </div>
  );
}
