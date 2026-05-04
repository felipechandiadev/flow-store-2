"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TextField from "@/shared/components/TextField";
import { Button } from "@/shared/components/Button";
import type { CreateSupplierInvoiceInput } from "@/features/purchasing-invoices/types/supplier-invoice.types";
import { createSupplierInvoiceAction } from "@/features/purchasing-invoices/actions/supplier-invoice.action";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export type CreateSupplierInvoiceDialogFormProps = {
  onClose?: () => void;
};

export function CreateSupplierInvoiceDialogForm({ onClose }: CreateSupplierInvoiceDialogFormProps) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PARTIAL" | "PAID">("PENDING");
  const [amountPaid, setAmountPaid] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => supplierId.trim().length > 0 && !busy, [supplierId, busy]);

  async function onSubmit() {
    setError(null);
    if (!supplierId.trim()) {
      setError("Indique el proveedor (UUID).");
      return;
    }
    setBusy(true);
    try {
      const input: CreateSupplierInvoiceInput = {
        branchId: "00000000-0000-0000-0000-000000000000",
        supplierId: supplierId.trim(),
        subtotal: n(total),
        taxAmount: 0,
        discountAmount: 0,
        total: n(total),
        externalReference: externalReference.trim() || null,
        notes: notes.trim() || null,
        paymentStatus,
        amountPaid: paymentStatus === "PAID" || paymentStatus === "PARTIAL" ? n(amountPaid) : 0,
        lines: [
          {
            quantity: 1,
            unitPrice: n(total),
            productName: "Factura proveedor (sin líneas)",
          },
        ],
        links: {},
      };

      await createSupplierInvoiceAction(input);
      onClose?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la factura");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3" data-test-id="create-supplier-invoice-dialog-form">
      <TextField label="Supplier ID (uuid)" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
      <TextField label="Referencia externa" value={externalReference} onChange={(e) => setExternalReference(e.target.value)} />
      <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <TextField label="Total" value={total} onChange={(e) => setTotal(e.target.value || "0")} />
      <TextField
        label="Payment status (PENDING | PARTIAL | PAID)"
        value={paymentStatus}
        onChange={(e) => {
          const v = e.target.value.trim().toUpperCase();
          if (v === "PENDING" || v === "PARTIAL" || v === "PAID") {
            setPaymentStatus(v);
          }
        }}
      />
      <TextField label="Amount paid" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value || "0")} />
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
