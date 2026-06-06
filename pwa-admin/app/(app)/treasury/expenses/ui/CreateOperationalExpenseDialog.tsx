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
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import { supplierOptionLabel } from "@/features/purchasing-dte/lib/supplier-option-label";
import { pickIvaTaxForLines, pickHonorariumRetentionTaxForLines } from "@/features/purchasing-dte/lib/iva-from-taxes";
import { amountsWhenNetEdited, amountsWhenTotalEdited } from "@/features/purchasing-dte/lib/clp-net-total";
import {
  amountsHonorariumWhenNetEdited,
  amountsHonorariumWhenTotalEdited,
} from "@/features/purchasing-dte/lib/honorarium-amounts";
import { PlannedPaymentPlanSection } from "@/shared/components/PlannedPaymentLines";
import type { PlannedPaymentPayload } from "@/shared/lib/planned-payment-plan";

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
  const [paymentPayload, setPaymentPayload] = useState<PlannedPaymentPayload>({
    mode: "PENDING_SCHEDULED",
    paidLines: [],
    scheduledLines: [],
  });
  const [paymentValid, setPaymentValid] = useState(false);

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

  const payeeBankAccounts = useMemo(() => {
    const raw = selectedLinkedSupplier?.person?.bankAccounts;
    return raw != null && raw.length > 0 ? raw : [];
  }, [selectedLinkedSupplier?.person?.bankAccounts]);

  const onPaymentStateChange = useCallback(
    (state: { payload: PlannedPaymentPayload; valid: boolean; error: string | null }) => {
      setPaymentPayload(state.payload);
      setPaymentValid(state.valid);
    },
    [],
  );

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
    setPaymentPayload({ mode: "PENDING_SCHEDULED", paidLines: [], scheduledLines: [] });
    setPaymentValid(false);
  }, [open, categoryOptions]);

  const onNetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const paymentsValid = useMemo(() => {
    if (!linkToDte || !linkedSupplierOpt?.id) {
      return true;
    }
    return paymentValid;
  }, [linkToDte, linkedSupplierOpt?.id, paymentValid]);

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
              "Revise cada cuota: montos mayores a cero, fecha de vencimiento y suma igual al total.",
            );
            return;
          }
        }

        const taxIdForLink = usesHonorarium ? retention.taxId : iva.taxId;
        const plannedPayments = paymentPayload.scheduledLines.map((l) => ({
          dueDate: l.dueDate,
          amount: l.amount,
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
              setPaymentPayload({ mode: "PENDING_SCHEDULED", paidLines: [], scheduledLines: [] });
              setPaymentValid(false);
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

            <PlannedPaymentPlanSection
              disabled={referenceLoading || Boolean(referenceError) || !linkedSupplierOpt?.id}
              total={total}
              immediatePaymentDate={operationDate}
              payeeSelected={Boolean(linkedSupplierOpt?.id)}
              payeeBankAccounts={payeeBankAccounts}
              companyBankAccounts={companyBankAccounts}
              schedule={{ kind: "monthly-chain" }}
              scheduledLinesBehavior="term-chain"
              allowedModes={["PENDING_SCHEDULED"]}
              sectionTitle="Cuotas de pago"
              totalLabel="total del documento"
              onStateChange={onPaymentStateChange}
              data-test-id="operating-expense-payment-plan"
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
