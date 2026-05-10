"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import type { Option } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import AutoComplete from "@/shared/components/AutoComplete/AutoComplete";
import type { Option as AutoOption } from "@/shared/components/AutoComplete/AutoComplete";
import { createOperationalExpenseAction } from "@/features/treasury-expenses/actions/operational-expense.action";
import type {
  ExpenseCategoryOption,
  OperationalExpenseLinkedDteKind,
  SupplierOption,
} from "@/features/treasury-expenses/types/operational-expense.types";
import { usePurchaseDocumentReferenceData } from "@/shared/components/PurchaseDocumentBuilder/usePurchaseDocumentReferenceData";
import type { SupplierGridRow, SupplierPersonBankAccount } from "@/features/purchasing-suppliers/types/supplier.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import { pickIvaTaxForLines, pickHonorariumRetentionTaxForLines } from "@/features/purchasing-dte/lib/iva-from-taxes";
import { amountsWhenNetEdited, amountsWhenTotalEdited } from "@/features/purchasing-dte/lib/clp-net-total";
import {
  amountsHonorariumWhenNetEdited,
  amountsHonorariumWhenTotalEdited,
} from "@/features/purchasing-dte/lib/honorarium-amounts";
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
} from "../../../purchasing/dte/invoices/ui/InvoicePlannedPaymentLines";

type CreateOperationalExpenseDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  categoryOptions: ExpenseCategoryOption[];
  supplierOptions: SupplierOption[];
};

function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_SUPPLIERS: SupplierGridRow[] = [];
const EMPTY_TAXES: TaxListItem[] = [];
const EMPTY_COMPANY_BANKS: CompanyBankAccountItem[] = [];
const EMPTY_SUPPLIER_BANKS: SupplierPersonBankAccount[] = [];

function defaultPaymentMethod(companyHasBanks: boolean, supplierHasBanks: boolean): InvoicePlannedPaymentMethodUI {
  return companyHasBanks && supplierHasBanks ? "TRANSFER" : "CASH";
}

const DTE_KIND_OPTIONS: Option[] = [
  { id: "SUPPLIER_INVOICE", label: "Factura de proveedor" },
  { id: "SUPPLIER_RECEIPT", label: "Boleta de proveedor" },
  { id: "SUPPLIER_HONORARIUM_RECEIPT", label: "Boleta de honorarios" },
];

export function CreateOperationalExpenseDialog({
  open,
  onClose,
  onSuccess,
  categoryOptions,
  supplierOptions,
}: CreateOperationalExpenseDialogProps) {
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : EMPTY_SUPPLIERS;
  const taxes = reference.status === "ready" ? reference.taxes : EMPTY_TAXES;
  const companyBankAccounts =
    reference.status === "ready" ? reference.companyBankAccounts : EMPTY_COMPANY_BANKS;
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceLoading = reference.status === "loading";

  const [name, setName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [operationDate, setOperationDate] = useState(isoDateToday());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [linkToDte, setLinkToDte] = useState(false);
  const [dteKind, setDteKind] = useState<OperationalExpenseLinkedDteKind>("SUPPLIER_INVOICE");
  const [linkedSupplierOpt, setLinkedSupplierOpt] = useState<AutoOption | null>(null);
  const [dteNumber, setDteNumber] = useState("");
  const [netStr, setNetStr] = useState("0");
  const [totalStr, setTotalStr] = useState("0");
  const lastAmountField = useRef<"net" | "total">("net");
  const [paymentLines, setPaymentLines] = useState<InvoicePlannedPaymentLineState[]>([]);
  const manualPaymentLockRef = useRef(false);
  const lastLinkedSupplierIdRef = useRef<string>("");

  const selectOptions: Option[] = useMemo(
    () => categoryOptions.map((c) => ({ id: c.id, label: c.name })),
    [categoryOptions],
  );
  const supplierSelectOptions: Option[] = useMemo(
    () => supplierOptions.map((s) => ({ id: s.id, label: s.name })),
    [supplierOptions],
  );

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);
  const iva = useMemo(() => pickIvaTaxForLines(taxes), [taxes]);
  const retention = useMemo(() => pickHonorariumRetentionTaxForLines(taxes), [taxes]);
  const usesHonorarium = dteKind === "SUPPLIER_HONORARIUM_RECEIPT";
  const ivaRate = iva.rate;
  const retentionRate = retention.rate;
  const rateForAmounts = usesHonorarium ? retentionRate : ivaRate;

  const supplierOptionsLinked: AutoOption[] = useMemo(
    () => activeSuppliers.map((s: SupplierGridRow) => ({ id: s.id, label: supplierOptionLabel(s) })),
    [activeSuppliers],
  );

  const selectedLinkedSupplier = useMemo(() => {
    const sid = linkedSupplierOpt?.id != null ? String(linkedSupplierOpt.id) : "";
    if (!sid) {
      return null;
    }
    return activeSuppliers.find((s) => s.id === sid) ?? null;
  }, [linkedSupplierOpt?.id, activeSuppliers]);

  const supplierBankAccountsRaw = selectedLinkedSupplier?.person?.bankAccounts;
  const supplierBankAccounts =
    supplierBankAccountsRaw != null && supplierBankAccountsRaw.length > 0
      ? supplierBankAccountsRaw
      : EMPTY_SUPPLIER_BANKS;

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setReferenceNumber("");
    setCategoryId(categoryOptions[0]?.id ?? null);
    setSupplierId(null);
    setOperationDate(isoDateToday());
    setDescription("");
    setError(null);
    setLinkToDte(false);
    setDteKind("SUPPLIER_INVOICE");
    setLinkedSupplierOpt(null);
    setDteNumber("");
    setNetStr("0");
    setTotalStr("0");
    lastAmountField.current = "net";
    setPaymentLines([]);
    manualPaymentLockRef.current = false;
    lastLinkedSupplierIdRef.current = "";
  }, [open, categoryOptions]);

  const onNetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      manualPaymentLockRef.current = false;
      const raw = e.target.value;
      const n = Math.max(0, Math.round(Number(raw) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
      lastAmountField.current = "net";
    },
    [usesHonorarium, rateForAmounts],
  );

  const onTotalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      manualPaymentLockRef.current = false;
      const raw = e.target.value;
      const g = Math.max(0, Math.round(Number(raw) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
      lastAmountField.current = "total";
    },
    [usesHonorarium, rateForAmounts],
  );

  useEffect(() => {
    if (!linkToDte) {
      return;
    }
    if (lastAmountField.current === "net") {
      const n = Math.max(0, Math.round(Number(netStr) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenNetEdited(n, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
    } else {
      const g = Math.max(0, Math.round(Number(totalStr) || 0));
      if (usesHonorarium) {
        const p = amountsHonorariumWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      } else {
        const p = amountsWhenTotalEdited(g, rateForAmounts);
        setNetStr(String(p.net));
        setTotalStr(String(p.total));
      }
    }
  }, [linkToDte, usesHonorarium, rateForAmounts]);

  const net = Math.max(0, Math.round(Number(netStr) || 0));
  const total = Math.max(0, Math.round(Number(totalStr) || 0));
  const taxAmount = total - net;

  useEffect(() => {
    if (!linkToDte) {
      lastLinkedSupplierIdRef.current = "";
      setPaymentLines((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const sid = linkedSupplierOpt?.id != null ? String(linkedSupplierOpt.id).trim() : "";
    if (!sid) {
      lastLinkedSupplierIdRef.current = "";
      setPaymentLines((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    if (lastLinkedSupplierIdRef.current === sid) {
      return;
    }
    lastLinkedSupplierIdRef.current = sid;
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
  }, [linkToDte, linkedSupplierOpt?.id, activeSuppliers, companyBankAccounts, total]);

  useEffect(() => {
    if (!linkToDte || manualPaymentLockRef.current) {
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
  }, [linkToDte, total, paymentLines.length]);

  useEffect(() => {
    if (!linkToDte || !linkedSupplierOpt?.id || paymentLines.length === 0) {
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
        const supBanks = selectedLinkedSupplier?.person?.bankAccounts;
        if (supBanks && supBanks.length > 0 && !l.supplierBankAccountKey) {
          l.supplierBankAccountKey = bankAccountOptionKey(supBanks[0], 0);
          changed = true;
        }
        return l;
      });
      return changed ? next : prev;
    });
  }, [
    linkToDte,
    linkedSupplierOpt?.id,
    companyBankAccounts,
    selectedLinkedSupplier?.person?.bankAccounts,
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
            const sb = selectedLinkedSupplier?.person?.bankAccounts?.[0];
            if (sb && !next.supplierBankAccountKey) {
              next.supplierBankAccountKey = bankAccountOptionKey(sb, 0);
            }
          }
          return next;
        }),
      );
    },
    [companyBankAccounts, selectedLinkedSupplier?.person?.bankAccounts],
  );

  const onAddPaymentLine = useCallback(() => {
    manualPaymentLockRef.current = false;
    setPaymentLines((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const term = selectedLinkedSupplier?.defaultPaymentTermDays ?? 0;
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
  }, [selectedLinkedSupplier?.defaultPaymentTermDays, total, companyBankAccounts, supplierBankAccounts]);

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
    if (!linkToDte || !linkedSupplierOpt?.id) {
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
    linkToDte,
    linkedSupplierOpt?.id,
    paymentLines,
    paymentsSum,
    total,
    companyBankAccounts.length,
    supplierBankAccounts.length,
  ]);

  const handleClose = () => {
    if (isPending) {
      return;
    }
    setError(null);
    onClose();
  };

  const submit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        if (!categoryId) {
          setError("Seleccione una categoría.");
          return;
        }
        const sidSubmit = linkToDte
          ? linkedSupplierOpt?.id != null
            ? String(linkedSupplierOpt.id).trim()
            : ""
          : supplierId != null
            ? String(supplierId).trim()
            : "";

        if (linkToDte) {
          if (referenceLoading || reference.status === "error") {
            setError(referenceError ?? "No se pudieron cargar datos de compras (proveedores, impuestos).");
            return;
          }
          if (!sidSubmit) {
            setError("Seleccione un proveedor para el documento tributario.");
            return;
          }
          if (!dteNumber.trim()) {
            setError("Indique el folio del documento tributario.");
            return;
          }
          if (net <= 0 || total <= 0) {
            setError("Indique monto neto y total mayores a cero.");
            return;
          }
          if (!paymentsValid) {
            setError(
              "Revise el plan de pagos: la suma debe igualar el total; transferencia requiere cuentas; cheque requiere número.",
            );
            return;
          }
        }

        const taxIdForLink = usesHonorarium ? retention.taxId : iva.taxId;
        const plannedPayments = paymentLines.map((l) => ({
          dueDate: l.dueDate,
          amount: parseClpAmountInput(l.amountStr),
          paymentMethod: l.paymentMethod,
          companyBankAccountKey:
            l.paymentMethod === "TRANSFER" || l.paymentMethod === "CHECK" ? l.companyBankAccountKey : null,
          supplierBankAccountKey: l.paymentMethod === "TRANSFER" ? l.supplierBankAccountKey : null,
          chequeNumber: l.paymentMethod === "CHECK" ? String(l.chequeNumber).trim() : null,
          chequeBankName:
            l.paymentMethod === "CHECK"
              ? (l.chequeBankName ?? "").trim() || null
              : null,
          chequeDrawerName:
            l.paymentMethod === "CHECK"
              ? (l.chequeDrawerName ?? "").trim() || null
              : null,
          chequeDueDate:
            l.paymentMethod === "CHECK"
              ? (l.chequeDueDate ?? "").trim() || null
              : null,
        }));

        const r = await createOperationalExpenseAction({
          name: name.trim(),
          categoryId,
          referenceNumber: referenceNumber.trim() || undefined,
          operationDate,
          description,
          supplierId: sidSubmit || undefined,
          ...(linkToDte
            ? {
                linkedTributaryDocument: {
                  kind: dteKind,
                  dteNumber: dteNumber.trim(),
                  netAmount: net,
                  totalAmount: total,
                  taxAmount,
                  taxId: taxIdForLink ?? null,
                  plannedPayments,
                },
              }
            : {}),
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

  const canSubmitResolved =
    Boolean(name.trim() && categoryId && operationDate && !isPending) &&
    (!linkToDte ||
      (!referenceLoading &&
        reference.status !== "error" &&
        Boolean(linkedSupplierOpt?.id) &&
        dteNumber.trim().length > 0 &&
        net > 0 &&
        total > 0 &&
        paymentsValid));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Registro de gasto operativo"
      size="lg"
      scroll="paper"
      data-test-id="operational-expense-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="operational-expense-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={submit} disabled={!canSubmitResolved}>
            Registrar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nombre"
          name="operating-expense-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nombre"
          data-test-id="operational-expense-name"
        />

        <TextField
          label="Referencia"
          name="operating-expense-reference"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Referencia"
          data-test-id="operational-expense-reference"
        />

        <Select
          label="Categoría de gasto"
          name="operating-expense-category"
          value={categoryId}
          onChange={(id) => setCategoryId(id == null ? null : String(id))}
          options={selectOptions}
          required
          data-test-id="operational-expense-category"
        />

        <Switch
          label="Vincular con documento tributario (DTE)"
          checked={linkToDte}
          onChange={(checked) => {
            setLinkToDte(checked);
            if (!checked) {
              setLinkedSupplierOpt(null);
              setPaymentLines([]);
              lastLinkedSupplierIdRef.current = "";
            }
          }}
          labelPosition="right"
          data-test-id="operating-expense-link-dte"
        />

        {!linkToDte ? (
          <Select
            label="Proveedor (opcional)"
            name="operating-expense-supplier"
            value={supplierId}
            onChange={(id) => setSupplierId(id == null ? null : String(id))}
            options={supplierSelectOptions}
            placeholder="Proveedor (opcional)"
            allowClear
            data-test-id="operating-expense-supplier"
          />
        ) : null}

        {linkToDte ? (
          <div className="flex flex-col gap-4 rounded-md border border-border/60 p-3">
            <p className="text-sm font-medium text-foreground">Documento tributario</p>
            {referenceError ? (
              <p className="text-sm text-error" role="alert">
                {referenceError}
              </p>
            ) : null}
            <Select
              label="Tipo de documento"
              name="operating-expense-dte-kind"
              value={dteKind}
              onChange={(id) => setDteKind(String(id) as OperationalExpenseLinkedDteKind)}
              options={DTE_KIND_OPTIONS}
              required
              data-test-id="operating-expense-dte-kind"
            />
            <AutoComplete
              label="Proveedor"
              name="operating-expense-dte-supplier"
              placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
              options={supplierOptionsLinked}
              value={linkedSupplierOpt}
              onChange={(opt) => setLinkedSupplierOpt(opt)}
              alwaysShowLabel
              disabled={referenceLoading || Boolean(referenceError)}
              data-test-id="operating-expense-dte-supplier"
            />
            <TextField
              label="Folio DTE"
              name="operating-expense-dte-folio"
              value={dteNumber}
              onChange={(e) => setDteNumber(e.target.value)}
              required
              data-test-id="operating-expense-dte-folio"
            />
            <TextField
              label="Monto neto"
              name="operating-expense-dte-net"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={netStr}
              onChange={onNetChange}
              data-test-id="operating-expense-dte-net"
            />
            <TextField
              label={usesHonorarium ? "Total (bruto, incluye retención)" : "Total (incluye IVA)"}
              name="operating-expense-dte-total"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={totalStr}
              onChange={onTotalChange}
              data-test-id="operating-expense-dte-total"
            />
            <p className="text-xs text-muted-foreground">
              {usesHonorarium
                ? `Retención honorarios (${retentionRate}%): líquido = total × (1 − tasa/100).`
                : `IVA (${ivaRate}%): montos coherentes con el impuesto "IVA" del catálogo.`}
            </p>

            <InvoicePlannedPaymentLines
              disabled={referenceLoading || Boolean(referenceError) || !linkedSupplierOpt?.id}
              companyBankAccounts={companyBankAccounts}
              supplierBankAccounts={supplierBankAccounts}
              lines={paymentLines}
              onAddLine={onAddPaymentLine}
              onRemoveLine={onRemovePaymentLine}
              onPatchLine={onPatchPaymentLine}
            />
          </div>
        ) : null}

        <TextField
          label="Fecha de operación"
          name="operating-expense-operation-date"
          type="date"
          value={operationDate}
          onChange={(e) => setOperationDate(e.target.value)}
          required
          placeholder="Fecha de operación"
          data-test-id="operating-expense-date"
        />

        <TextField
          label="Descripción (opcional)"
          name="operating-expense-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Descripción (opcional)"
          data-test-id="operational-expense-description"
        />
      </div>
    </Dialog>
  );
}
