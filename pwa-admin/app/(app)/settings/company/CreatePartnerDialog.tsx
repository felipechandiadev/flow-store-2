"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import type { Option } from "@/shared/components/Select";
import { createShareholderAction } from "@/features/settings-shareholders/actions/shareholder.action";

const DOC_OPTIONS: Option[] = [
  { id: "RUN", label: "RUN" },
  { id: "RUT", label: "RUT" },
];

const PARTNER_TYPE_OPTIONS: Option[] = [
  { id: "FOUNDING_PARTNER", label: "Socio fundador" },
  { id: "INVESTING_PARTNER", label: "Socio inversionista" },
  { id: "OTHER", label: "Otro" },
];

type CreatePartnerDialogProps = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  onCreated?: () => void | Promise<void>;
};

export function CreatePartnerDialog({ open, onClose, companyId, onCreated }: CreatePartnerDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState<string | null>("RUN");
  const [documentNumber, setDocumentNumber] = useState("");
  const [ownership, setOwnership] = useState("");
  const [partnerType, setPartnerType] = useState<string | null>("FOUNDING_PARTNER");
  const [joinDate, setJoinDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }
    setFirstName("");
    setLastName("");
    setDocumentType("RUN");
    setDocumentNumber("");
    setOwnership("");
    setPartnerType("FOUNDING_PARTNER");
    setJoinDate("");
    setError(null);
  }, [open]);

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      documentNumber.trim().length > 0 &&
      documentType &&
      partnerType &&
      joinDate.trim().length > 0 &&
      !pending
    );
  }, [firstName, documentNumber, documentType, partnerType, joinDate, pending]);

  const submit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const own = Number(String(ownership).replace(",", "."));
        const r = await createShareholderAction({
          companyId,
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          documentType: String(documentType),
          documentNumber: documentNumber.trim(),
          ownershipPercentage: Number.isFinite(own) && own > 0 ? own : undefined,
          partnerType: String(partnerType),
          joinDate: joinDate.trim(),
        });
        if (r.success) {
          await onCreated?.();
          onClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => !pending && onClose()}
      title="Agregar socio"
      size="md"
      scroll="paper"
      data-test-id="create-partner-dialog"
      alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <TextField label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Select
          label="Tipo documento"
          options={DOC_OPTIONS}
          value={documentType}
          onChange={(id) => setDocumentType(id == null ? null : String(id).trim())}
          required
        />
        <TextField
          label="Número documento"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
        />
        <TextField
          label="Participación (%)"
          value={ownership}
          onChange={(e) => setOwnership(e.target.value)}
          placeholder="0-100"
        />
        <Select
          label="Tipo de socio"
          options={PARTNER_TYPE_OPTIONS}
          value={partnerType}
          onChange={(id) => setPartnerType(id == null ? null : String(id).trim())}
          required
        />
        <TextField label="Fecha de ingreso" type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} required />
      </div>
    </Dialog>
  );
}
