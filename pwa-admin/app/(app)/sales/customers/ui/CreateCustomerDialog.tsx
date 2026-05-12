"use client";

import { useEffect, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import { createCustomerAction } from "@/features/sales-customers/actions/customer.action";
import type { CreateCustomerFormInput } from "@/features/sales-customers/types/customer.types";

const DOC_OPTIONS: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "OTHER", label: "Otro" },
];

const PAYMENT_DAY_OPTIONS: Option[] = [
  { id: "5", label: "5" },
  { id: "10", label: "10" },
  { id: "15", label: "15" },
  { id: "20", label: "20" },
  { id: "25", label: "25" },
  { id: "30", label: "30" },
];

export type CreateCustomerDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  /** Si false, no se muestran límite de crédito ni día de pago. */
  internalCreditEnabled?: boolean;
};

export function CreateCustomerDialog({
  open,
  onClose,
  onSuccess,
  internalCreditEnabled = true,
}: CreateCustomerDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<"RUN" | "PASSPORT" | "OTHER">("RUN");
  const [documentNumber, setDocumentNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimitStr, setCreditLimitStr] = useState("0");
  const [paymentDayOfMonth, setPaymentDayOfMonth] = useState<string>("5");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setFirstName("");
      setLastName("");
      setDocumentType("RUN");
      setDocumentNumber("");
      setEmail("");
      setPhone("");
      setAddress("");
      setCreditLimitStr("0");
      setPaymentDayOfMonth("5");
      setNotes("");
      setError(null);
    }
  }, [open]);

  const reset = () => {
    setFirstName("");
    setLastName("");
    setDocumentType("RUN");
    setDocumentNumber("");
    setEmail("");
    setPhone("");
    setAddress("");
    setCreditLimitStr("0");
    setPaymentDayOfMonth("5");
    setNotes("");
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const creditLimit = internalCreditEnabled
      ? Math.max(0, Math.round(Number(creditLimitStr.replace(/\D/g, "")) || 0))
      : 0;
    const day = Number(paymentDayOfMonth) as CreateCustomerFormInput["paymentDayOfMonth"];
    const input: CreateCustomerFormInput = {
      personType: "NATURAL",
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      documentType,
      documentNumber: documentNumber.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      creditLimit,
      paymentDayOfMonth: internalCreditEnabled
        ? [5, 10, 15, 20, 25, 30].includes(day)
          ? day
          : 5
        : 5,
      notes: notes.trim() || null,
    };

    startTransition(() => {
      void (async () => {
        const r = await createCustomerAction(input);
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit = !isPending && firstName.trim().length > 0 && documentNumber.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nuevo cliente"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="customer-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="customer-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
            Crear cliente
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          El cliente se registra como persona natural. El documento debe ser único en el sistema.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre"
            name="customer-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre"
            required
            data-test-id="customer-create-first-name"
          />
          <TextField
            label="Apellidos (opcional)"
            name="customer-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellidos"
            data-test-id="customer-create-last-name"
          />
        </div>

        <Select
          label="Tipo de documento"
          name="customer-doc-type"
          placeholder="Tipo de documento"
          options={DOC_OPTIONS}
          value={documentType}
          onChange={(v) => setDocumentType((v != null ? String(v) : "RUN") as "RUN" | "PASSPORT" | "OTHER")}
          required
          data-test-id="customer-create-doc-type"
        />

        <TextField
          label={documentType === "RUN" ? "RUN" : "Número de documento"}
          name="customer-document-number"
          type={documentType === "RUN" ? "dni" : "text"}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
          data-test-id="customer-create-document"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Correo (opcional)"
            name="customer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-test-id="customer-create-email"
          />
          <TextField
            label="Teléfono (opcional)"
            name="customer-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            data-test-id="customer-create-phone"
          />
        </div>

        <TextField
          label="Dirección (opcional)"
          name="customer-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          data-test-id="customer-create-address"
        />

        {internalCreditEnabled ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <p className="text-sm font-semibold text-foreground">Datos de cliente</p>
            <TextField
              label="Límite de crédito (CLP)"
              name="customer-credit-limit"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={creditLimitStr}
              onChange={(e) => setCreditLimitStr(e.target.value)}
              data-test-id="customer-create-credit-limit"
            />
            <Select
              label="Día de pago del mes"
              name="customer-payment-day"
              placeholder="Día de pago"
              options={PAYMENT_DAY_OPTIONS}
              value={paymentDayOfMonth}
              onChange={(v) => setPaymentDayOfMonth(v != null ? String(v) : "5")}
              alwaysShowLabel
              data-test-id="customer-create-payment-day"
            />
            <TextField
              label="Notas (opcional)"
              name="customer-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-test-id="customer-create-notes"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <p className="text-sm text-muted-foreground">
              El crédito interno está deshabilitado en la empresa. No se asigna límite de crédito ni día de
              pago.
            </p>
            <TextField
              label="Notas (opcional)"
              name="customer-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-test-id="customer-create-notes"
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
