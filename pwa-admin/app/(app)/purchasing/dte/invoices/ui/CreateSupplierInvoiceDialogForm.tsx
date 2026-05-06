"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/shared/components/TextField/TextField";
import AutoComplete from "@/shared/components/AutoComplete/AutoComplete";
import type { Option } from "@/shared/components/AutoComplete/AutoComplete";
import { Button } from "@/shared/components/Button";
import type { CreateSupplierInvoiceInput } from "@/features/purchasing-invoices/types/supplier-invoice.types";
import { createSupplierInvoiceAction } from "@/features/purchasing-invoices/actions/supplier-invoice.action";
import { usePurchaseDocumentReferenceData } from "@/shared/components/PurchaseDocumentBuilder/usePurchaseDocumentReferenceData";
import type { SupplierGridRow, SupplierPersonBankAccount } from "@/features/purchasing-suppliers/types/supplier.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import { pickIvaTaxForLines } from "@/features/purchasing-dte/lib/iva-from-taxes";
import { amountsWhenNetEdited, amountsWhenTotalEdited } from "@/features/purchasing-dte/lib/clp-net-total";
import {
  addCalendarDays,
  bankAccountOptionKey,
  parseYyyyMmDdLocal,
  parseClpAmountInput,
  splitTotalAcrossLines,
  toYyyyMmDdLocal,
} from "@/features/purchasing-dte/lib/planned-payment-helpers";
import {
  InvoicePlannedPaymentLines,
  type InvoicePlannedPaymentLineState,
  type InvoicePlannedPaymentMethodUI,
} from "./InvoicePlannedPaymentLines";

export type CreateSupplierInvoiceDialogFormProps = {
  onClose?: () => void;
};

/** Referencias estables: evitar `[]` inline en cada render (rompe deps de useEffect). */
const EMPTY_SUPPLIERS: SupplierGridRow[] = [];
const EMPTY_TAXES: TaxListItem[] = [];
const EMPTY_COMPANY_BANKS: CompanyBankAccountItem[] = [];
const EMPTY_SUPPLIER_BANKS: SupplierPersonBankAccount[] = [];

function defaultPaymentMethod(companyHasBanks: boolean, supplierHasBanks: boolean): InvoicePlannedPaymentMethodUI {
  return companyHasBanks && supplierHasBanks ? "TRANSFER" : "CASH";
}

export function CreateSupplierInvoiceDialogForm({ onClose }: CreateSupplierInvoiceDialogFormProps) {
  const router = useRouter();
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : EMPTY_SUPPLIERS;
  const taxes = reference.status === "ready" ? reference.taxes : EMPTY_TAXES;
  const branchId = reference.status === "ready" ? reference.branchId : "";
  const companyBankAccounts =
    reference.status === "ready" ? reference.companyBankAccounts : EMPTY_COMPANY_BANKS;
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceLoading = reference.status === "loading";

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);
  const iva = useMemo(() => pickIvaTaxForLines(taxes), [taxes]);

  const supplierOptions: Option[] = useMemo(
    () => activeSuppliers.map((s: SupplierGridRow) => ({ id: s.id, label: supplierOptionLabel(s) })),
    [activeSuppliers],
  );

  const [supplierOpt, setSupplierOpt] = useState<Option | null>(null);
  const [dteNumber, setDteNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [netStr, setNetStr] = useState("0");
  const [totalStr, setTotalStr] = useState("0");
  const lastAmountField = useRef<"net" | "total">("net");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentLines, setPaymentLines] = useState<InvoicePlannedPaymentLineState[]>([]);
  const manualPaymentLockRef = useRef(false);
  const lastSupplierIdRef = useRef<string>("");

  const ivaRate = iva.rate;

  const selectedSupplier = useMemo(() => {
    const sid = supplierOpt?.id != null ? String(supplierOpt.id) : "";
    if (!sid) {
      return null;
    }
    return activeSuppliers.find((s) => s.id === sid) ?? null;
  }, [supplierOpt?.id, activeSuppliers]);

  const supplierBankAccountsRaw = selectedSupplier?.person?.bankAccounts;
  const supplierBankAccounts =
    supplierBankAccountsRaw != null && supplierBankAccountsRaw.length > 0
      ? supplierBankAccountsRaw
      : EMPTY_SUPPLIER_BANKS;

  const onNetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      manualPaymentLockRef.current = false;
      const raw = e.target.value;
      const n = Math.max(0, Math.round(Number(raw) || 0));
      const p = amountsWhenNetEdited(n, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
      lastAmountField.current = "net";
    },
    [ivaRate],
  );

  const onTotalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      manualPaymentLockRef.current = false;
      const raw = e.target.value;
      const g = Math.max(0, Math.round(Number(raw) || 0));
      const p = amountsWhenTotalEdited(g, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
      lastAmountField.current = "total";
    },
    [ivaRate],
  );

  useEffect(() => {
    if (lastAmountField.current === "net") {
      const n = Math.max(0, Math.round(Number(netStr) || 0));
      const p = amountsWhenNetEdited(n, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
    } else {
      const g = Math.max(0, Math.round(Number(totalStr) || 0));
      const p = amountsWhenTotalEdited(g, ivaRate);
      setNetStr(String(p.net));
      setTotalStr(String(p.total));
    }
  }, [ivaRate]);

  const net = Math.max(0, Math.round(Number(netStr) || 0));
  const total = Math.max(0, Math.round(Number(totalStr) || 0));
  const taxAmount = total - net;

  useEffect(() => {
    const sid = supplierOpt?.id != null ? String(supplierOpt.id).trim() : "";
    if (!sid) {
      lastSupplierIdRef.current = "";
      setPaymentLines((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    if (lastSupplierIdRef.current === sid) {
      return;
    }
    lastSupplierIdRef.current = sid;
    const sup = activeSuppliers.find((s) => s.id === sid);
    const term = sup?.defaultPaymentTermDays ?? 0;
    const firstDue = addCalendarDays(new Date(), term);
    const banks = sup?.person?.bankAccounts ?? [];
    const dm = defaultPaymentMethod(companyBankAccounts.length > 0, banks.length > 0);
    setPaymentLines([
      {
        id: crypto.randomUUID(),
        dueDate: toYyyyMmDdLocal(firstDue),
        amountStr: String(total),
        paymentMethod: dm,
        companyBankAccountKey:
          companyBankAccounts[0] != null ? bankAccountOptionKey(companyBankAccounts[0], 0) : null,
        supplierBankAccountKey: banks[0] != null ? bankAccountOptionKey(banks[0], 0) : null,
        chequeNumber: "",
      },
    ]);
    manualPaymentLockRef.current = false;
  }, [supplierOpt?.id, activeSuppliers, companyBankAccounts, total]);

  useEffect(() => {
    if (manualPaymentLockRef.current) {
      return;
    }
    setPaymentLines((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const parts = splitTotalAcrossLines(total, prev.length);
      let changed = false;
      const next = prev.map((l, i) => {
        const ns = String(parts[i] ?? 0);
        if (l.amountStr !== ns) {
          changed = true;
        }
        return { ...l, amountStr: ns };
      });
      return changed ? next : prev;
    });
  }, [total, paymentLines.length]);

  /** Si cargan cuentas después de elegir proveedor, completa claves en transferencias aún sin valor. */
  useEffect(() => {
    if (!supplierOpt?.id || paymentLines.length === 0) {
      return;
    }
    setPaymentLines((prev) => {
      let changed = false;
      const next = prev.map((line) => {
        if (line.paymentMethod !== "TRANSFER") {
          return line;
        }
        let l = { ...line };
        if (companyBankAccounts.length > 0 && !l.companyBankAccountKey) {
          l.companyBankAccountKey = bankAccountOptionKey(companyBankAccounts[0], 0);
          changed = true;
        }
        const supBanks = selectedSupplier?.person?.bankAccounts;
        if (supBanks && supBanks.length > 0 && !l.supplierBankAccountKey) {
          l.supplierBankAccountKey = bankAccountOptionKey(supBanks[0], 0);
          changed = true;
        }
        return l;
      });
      return changed ? next : prev;
    });
  }, [
    supplierOpt?.id,
    companyBankAccounts,
    selectedSupplier?.person?.bankAccounts,
    paymentLines.length,
  ]);

  const onPatchPaymentLine = useCallback(
    (id: string, patch: Partial<InvoicePlannedPaymentLineState>) => {
      if (patch.amountStr !== undefined) {
        manualPaymentLockRef.current = true;
      }
      setPaymentLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) {
            return l;
          }
          let next: InvoicePlannedPaymentLineState = { ...l, ...patch };
          if (next.paymentMethod === "TRANSFER") {
            if (companyBankAccounts[0] && !next.companyBankAccountKey) {
              next.companyBankAccountKey = bankAccountOptionKey(companyBankAccounts[0], 0);
            }
            const sb = selectedSupplier?.person?.bankAccounts?.[0];
            if (sb && !next.supplierBankAccountKey) {
              next.supplierBankAccountKey = bankAccountOptionKey(sb, 0);
            }
          }
          return next;
        }),
      );
    },
    [companyBankAccounts, selectedSupplier?.person?.bankAccounts],
  );

  const onAddPaymentLine = useCallback(() => {
    manualPaymentLockRef.current = false;
    setPaymentLines((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const term = selectedSupplier?.defaultPaymentTermDays ?? 0;
      const lastDue = parseYyyyMmDdLocal(prev[prev.length - 1].dueDate);
      const nextDue = addCalendarDays(lastDue, term);
      const parts = splitTotalAcrossLines(total, prev.length + 1);
      const dm = defaultPaymentMethod(companyBankAccounts.length > 0, supplierBankAccounts.length > 0);
      const banks = supplierBankAccounts;
      const nextLine: InvoicePlannedPaymentLineState = {
        id: crypto.randomUUID(),
        dueDate: toYyyyMmDdLocal(nextDue),
        amountStr: String(parts[parts.length - 1] ?? 0),
        paymentMethod: dm,
        companyBankAccountKey:
          companyBankAccounts[0] != null ? bankAccountOptionKey(companyBankAccounts[0], 0) : null,
        supplierBankAccountKey: banks[0] != null ? bankAccountOptionKey(banks[0], 0) : null,
        chequeNumber: "",
      };
      return prev
        .map((l, i) => ({ ...l, amountStr: String(parts[i] ?? 0) }))
        .concat([nextLine]);
    });
  }, [selectedSupplier?.defaultPaymentTermDays, total, companyBankAccounts, supplierBankAccounts]);

  const onRemovePaymentLine = useCallback(
    (id: string) => {
      manualPaymentLockRef.current = false;
      setPaymentLines((prev) => {
        if (prev.length <= 1) {
          return prev;
        }
        const next = prev.filter((l) => l.id !== id);
        const parts = splitTotalAcrossLines(total, next.length);
        return next.map((l, i) => ({ ...l, amountStr: String(parts[i] ?? 0) }));
      });
    },
    [total],
  );

  const paymentsSum = useMemo(
    () => paymentLines.reduce((s, l) => s + parseClpAmountInput(l.amountStr), 0),
    [paymentLines],
  );

  const paymentsValid = useMemo(() => {
    if (!supplierOpt?.id) {
      return true;
    }
    if (paymentLines.length === 0) {
      return false;
    }
    if (Math.abs(paymentsSum - total) > 1) {
      return false;
    }
    for (const l of paymentLines) {
      const a = parseClpAmountInput(l.amountStr);
      if (a <= 0) {
        return false;
      }
      if (l.paymentMethod === "TRANSFER") {
        if (companyBankAccounts.length === 0 || supplierBankAccounts.length === 0) {
          return false;
        }
        if (!l.companyBankAccountKey || !l.supplierBankAccountKey) {
          return false;
        }
      }
      if (l.paymentMethod === "CHECK") {
        if (companyBankAccounts.length === 0) {
          return false;
        }
        if (!l.companyBankAccountKey || !String(l.chequeNumber).trim()) {
          return false;
        }
      }
    }
    return true;
  }, [
    supplierOpt?.id,
    paymentLines,
    paymentsSum,
    total,
    companyBankAccounts.length,
    supplierBankAccounts.length,
  ]);

  const canSubmit = useMemo(() => {
    const sid = supplierOpt?.id && String(supplierOpt.id).trim();
    return Boolean(
      sid && branchId && net > 0 && total > 0 && !busy && !referenceLoading && paymentsValid,
    );
  }, [supplierOpt, branchId, net, total, busy, referenceLoading, paymentsValid]);

  const submitBlockedReason = useMemo(() => {
    if (referenceLoading || busy || reference.status === "error") {
      return null;
    }
    const sid = supplierOpt?.id != null ? String(supplierOpt.id).trim() : "";
    if (sid && branchId && net > 0 && total > 0 && paymentsValid) {
      return null;
    }
    if (!sid) {
      return "Seleccione un proveedor.";
    }
    if (!branchId) {
      return "No hay sucursal disponible. Configure al menos una sucursal activa en Ajustes.";
    }
    if (net <= 0 || total <= 0) {
      return "Indique monto neto y total mayores a cero.";
    }
    if (paymentLines.length === 0) {
      return "No hay líneas de pago; vuelva a elegir el proveedor si acaba de cargar la página.";
    }
    if (Math.abs(paymentsSum - total) > 1) {
      return "La suma de los pagos debe coincidir con el total de la factura.";
    }
    return "Revise cada pago: transferencia requiere cuentas en empresa y proveedor; cheque requiere cuenta empresa y número de cheque.";
  }, [
    referenceLoading,
    busy,
    reference.status,
    supplierOpt?.id,
    branchId,
    net,
    total,
    paymentsValid,
    paymentLines.length,
    paymentsSum,
  ]);

  async function onSubmit() {
    setError(null);
    if (!branchId) {
      setError("No hay sucursal configurada.");
      return;
    }
    const supplierId = supplierOpt?.id != null ? String(supplierOpt.id).trim() : "";
    if (!supplierId) {
      setError("Seleccione un proveedor.");
      return;
    }
    if (net <= 0 || total <= 0) {
      setError("Indique montos válidos.");
      return;
    }
    if (!paymentsValid) {
      if (paymentLines.length === 0) {
        setError("Defina al menos una línea de pago.");
      } else if (Math.abs(paymentsSum - total) > 1) {
        setError("La suma de los pagos debe igualar el total de la factura.");
      } else {
        setError(
          "Revise cada línea: montos mayores a cero; en transferencia, cuentas empresa y proveedor; en cheque, cuenta empresa y número de cheque.",
        );
      }
      return;
    }

    setBusy(true);
    try {
      const plannedPayments = paymentLines.map((l) => ({
        dueDate: l.dueDate,
        amount: parseClpAmountInput(l.amountStr),
        paymentMethod: l.paymentMethod,
        companyBankAccountKey:
          l.paymentMethod === "TRANSFER" || l.paymentMethod === "CHECK" ? l.companyBankAccountKey : null,
        supplierBankAccountKey: l.paymentMethod === "TRANSFER" ? l.supplierBankAccountKey : null,
        chequeNumber: l.paymentMethod === "CHECK" ? String(l.chequeNumber).trim() : null,
      }));

      const input: CreateSupplierInvoiceInput = {
        branchId,
        supplierId,
        dteNumber: dteNumber.trim() || null,
        notes: notes.trim() || null,
        subtotal: net,
        taxAmount,
        discountAmount: 0,
        total,
        paymentStatus: "PENDING",
        amountPaid: 0,
        lines: [
          {
            quantity: 1,
            unitPrice: net,
            productName: "Factura proveedor (resumen)",
            subtotal: net,
            taxRate: ivaRate,
            taxAmount,
            total,
            ...(iva.taxId ? { taxId: iva.taxId } : {}),
          },
        ],
        links: {},
        plannedPayments,
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
      {referenceError ? (
        <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
          {referenceError}
        </p>
      ) : null}
      <AutoComplete
        label="Proveedor"
        name="dte-invoice-supplier"
        placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
        options={supplierOptions}
        value={supplierOpt}
        onChange={(opt) => setSupplierOpt(opt)}
        alwaysShowLabel
        disabled={referenceLoading || Boolean(referenceError)}
        data-test-id="dte-invoice-supplier"
      />
      <TextField label="Folio DTE" value={dteNumber} onChange={(e) => setDteNumber(e.target.value)} />
      <TextField label="Notas" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <TextField
        label="Monto neto"
        type="currency"
        currencySymbol="$"
        startSymbol="$"
        value={netStr}
        onChange={onNetChange}
      />
      <TextField
        label="Total"
        type="currency"
        currencySymbol="$"
        startSymbol="$"
        value={totalStr}
        onChange={onTotalChange}
      />

      <InvoicePlannedPaymentLines
        disabled={referenceLoading || Boolean(referenceError) || !supplierOpt?.id}
        companyBankAccounts={companyBankAccounts}
        supplierBankAccounts={supplierBankAccounts}
        lines={paymentLines}
        onAddLine={onAddPaymentLine}
        onRemoveLine={onRemovePaymentLine}
        onPatchLine={onPatchPaymentLine}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {submitBlockedReason && !error ? (
        <p className="text-xs text-muted-foreground" role="status">
          {submitBlockedReason}
        </p>
      ) : null}
      <div className="mt-2 flex justify-between gap-2">
        <Button variant="secondary" type="button" onClick={() => onClose?.()}>
          Cancelar
        </Button>
        <Button variant="primary" type="button" disabled={!canSubmit} loading={busy} onClick={onSubmit}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
