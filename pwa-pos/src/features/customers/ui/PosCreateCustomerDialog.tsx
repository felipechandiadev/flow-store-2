"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Alert,
  Button,
  Dialog,
  Select,
  TextField,
} from "@/shared/admin-shared";
import type { Option } from "@/shared/components/Select/Select";
import { createPosCustomerAction } from "@/features/customers/actions/customers-pos.action";
import type { PosCreateCustomerInput } from "@/features/customers/types/pos-customer-create.types";

const DOC_OPTIONS: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "PASSPORT", label: "Pasaporte" },
  { id: "DNI", label: "DNI" },
];

const PAYMENT_DAY_OPTIONS: Option[] = [
  { id: "5", label: "5" },
  { id: "10", label: "10" },
  { id: "15", label: "15" },
  { id: "20", label: "20" },
  { id: "25", label: "25" },
  { id: "30", label: "30" },
];

export type PosCreateCustomerDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Si false, no se muestran límite de crédito ni día de pago. */
  internalCreditEnabled?: boolean;
  onSuccess?: (info: {
    customerId: string;
    displayName: string;
    documentNumber: string;
    phone: string;
    email: string | null;
  }) => void | Promise<void>;
};

export function PosCreateCustomerDialog({
  open,
  onClose,
  onSuccess,
  internalCreditEnabled = false,
}: PosCreateCustomerDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<"RUN" | "PASSPORT" | "DNI">("RUN");
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

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    const creditLimit = internalCreditEnabled
      ? Math.max(0, Math.round(Number(creditLimitStr.replace(/\D/g, "")) || 0))
      : 0;
    const day = Number(paymentDayOfMonth);
    const input: PosCreateCustomerInput = {
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
          ? (day as 5 | 10 | 15 | 20 | 25 | 30)
          : 5
        : 5,
      notes: notes.trim() || null,
    };

    startTransition(() => {
      void (async () => {
        const r = await createPosCustomerAction(input);
        if (r.success) {
          const displayName =
            [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim() || "Cliente";
          await onSuccess?.({
            customerId: r.customerId,
            displayName,
            documentNumber: documentNumber.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
          });
          handleClose();
        } else {
          setError(r.message);
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
      data-test-id="pos-customer-create-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
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
          Persona natural. El documento debe ser único en la empresa.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Nombre"
            name="pos-customer-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Nombre"
            required
          />
          <TextField
            label="Apellidos (opcional)"
            name="pos-customer-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Apellidos"
          />
        </div>

        <Select
          label="Tipo de documento"
          name="pos-customer-doc-type"
          placeholder="Tipo de documento"
          options={DOC_OPTIONS}
          value={documentType}
          onChange={(v) => setDocumentType((v != null ? String(v) : "RUN") as "RUN" | "PASSPORT" | "DNI")}
          required
        />

        <TextField
          label={documentType === "RUN" ? "RUN" : documentType === "DNI" ? "DNI" : "Número de documento"}
          name="pos-customer-document-number"
          type={documentType === "RUN" || documentType === "DNI" ? "dni" : "text"}
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Email" name="pos-customer-email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Teléfono" name="pos-customer-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <TextField label="Dirección" name="pos-customer-address" value={address} onChange={(e) => setAddress(e.target.value)} />

        {internalCreditEnabled ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Límite de crédito"
              name="pos-customer-credit-limit"
              type="currency"
              value={creditLimitStr}
              onChange={(e) => setCreditLimitStr(e.target.value)}
              data-test-id="pos-customer-create-credit-limit"
            />
            <Select
              label="Día de pago"
              name="pos-customer-payment-day"
              options={PAYMENT_DAY_OPTIONS}
              value={paymentDayOfMonth}
              onChange={(v) => setPaymentDayOfMonth(v != null ? String(v) : "5")}
              data-test-id="pos-customer-create-payment-day"
            />
          </div>
        ) : null}

        <TextField
          label="Notas (opcional)"
          name="pos-customer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>
    </Dialog>
  );
}
