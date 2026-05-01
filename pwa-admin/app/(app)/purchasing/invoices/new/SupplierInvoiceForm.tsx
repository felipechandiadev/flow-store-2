"use client";

import { useMemo, useState } from "react";
import TextField from "@/shared/components/TextField";
import { Button } from "@/shared/components/Button";
import type { CreateSupplierInvoiceInput } from "@/features/purchasing-invoices/types/supplier-invoice.types";
import { createSupplierInvoiceAction } from "@/features/purchasing-invoices/actions/supplier-invoice.action";

function n(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function SupplierInvoiceForm() {
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
      setError("supplierId es requerido (por ahora, se ingresa manual).");
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error creando la factura");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 max-w-3xl" data-test-id="supplier-invoices-new-form">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Nueva factura</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Versión inicial: crea una transacción <code>SUPPLIER_INVOICE</code>. (Luego la conectamos a PO/Recepción y líneas reales.)
      </p>

      <div className="mt-4 grid gap-3">
        <TextField label="Supplier ID (uuid)" value={supplierId} onChange={(e: any) => setSupplierId(String(e?.target?.value ?? ""))} />
        <TextField
          label="Referencia externa"
          value={externalReference}
          onChange={(e: any) => setExternalReference(String(e?.target?.value ?? ""))}
        />
        <TextField label="Notas" value={notes} onChange={(e: any) => setNotes(String(e?.target?.value ?? ""))} />
        <TextField label="Total" value={total} onChange={(e: any) => setTotal(String(e?.target?.value ?? "0"))} />
        <TextField
          label="Payment status (PENDING | PARTIAL | PAID)"
          value={paymentStatus}
          onChange={(e: any) => setPaymentStatus(String(e?.target?.value ?? "PENDING") as any)}
        />
        <TextField
          label="Amount paid"
          value={amountPaid}
          onChange={(e: any) => setAmountPaid(String(e?.target?.value ?? "0"))}
        />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="mt-2 flex justify-end">
          <Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
            {busy ? "Creando..." : "Crear factura"}
          </Button>
        </div>
      </div>
    </div>
  );
}

