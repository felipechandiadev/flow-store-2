"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TextField from "@/shared/components/TextField";
import { Button } from "@/shared/components/Button";
import type { CreateSupplierCreditNoteInput } from "@/features/purchasing-supplier-credit-notes/types/supplier-credit-note.types";
import { createSupplierCreditNoteAction } from "@/features/purchasing-supplier-credit-notes/actions/supplier-credit-note.action";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export type CreateSupplierCreditNoteDialogFormProps = {
  onClose?: () => void;
};

export function CreateSupplierCreditNoteDialogForm({ onClose }: CreateSupplierCreditNoteDialogFormProps) {
  const router = useRouter();
  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [purchaseReturnId, setPurchaseReturnId] = useState("");
  const [supplierInvoiceId, setSupplierInvoiceId] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => branchId.trim() && supplierId.trim() && purchaseReturnId.trim() && !busy,
    [branchId, supplierId, purchaseReturnId, busy],
  );

  async function onSubmit() {
    setError(null);
    const t = n(total);
    const input: CreateSupplierCreditNoteInput = {
      branchId: branchId.trim(),
      supplierId: supplierId.trim(),
      purchaseReturnId: purchaseReturnId.trim(),
      supplierInvoiceId: supplierInvoiceId.trim() || null,
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
          productName: "Nota de crédito proveedor (resumen)",
          subtotal: t,
          total: t,
          taxAmount: 0,
          taxRate: 0,
        },
      ],
    };
    setBusy(true);
    try {
      const res = await createSupplierCreditNoteAction(input);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onClose?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3" data-test-id="create-supplier-credit-note-dialog-form">
      <TextField label="Branch ID (uuid)" value={branchId} onChange={(e) => setBranchId(e.target.value)} />
      <TextField label="Supplier ID (uuid)" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
      <TextField
        label="Purchase return ID (uuid PURCHASE_RETURN)"
        value={purchaseReturnId}
        onChange={(e) => setPurchaseReturnId(e.target.value)}
      />
      <TextField
        label="Supplier invoice ID (uuid, opcional)"
        value={supplierInvoiceId}
        onChange={(e) => setSupplierInvoiceId(e.target.value)}
      />
      <TextField label="Referencia externa" value={externalReference} onChange={(e) => setExternalReference(e.target.value)} />
      <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <TextField label="Total" value={total} onChange={(e) => setTotal(e.target.value || "0")} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="mt-2 flex justify-between gap-2">
        <Button variant="secondary" type="button" onClick={() => onClose?.()}>
          Cancelar
        </Button>
        <Button variant="primary" type="button" disabled={!canSubmit} loading={busy} onClick={onSubmit}>
          Crear
        </Button>
      </div>
    </div>
  );
}
