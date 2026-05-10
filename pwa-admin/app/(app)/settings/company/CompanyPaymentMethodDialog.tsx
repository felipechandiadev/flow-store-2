"use client";

import { useEffect, useMemo, useState } from "react";
import Dialog from "@/shared/components/Dialog";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import { Button } from "@/shared/components/Button";
import Alert from "@/shared/components/Alert/Alert";
import {
  COMPANY_PAYMENT_METHOD_LABELS,
  type CompanyPaymentMethodConfig,
  type CompanyPaymentMethodId,
} from "@/features/companies/types/company-payment-methods.types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Si viene definido, el dialog opera en modo edición. */
  initial: CompanyPaymentMethodConfig | null;
  /** Llamado cuando el usuario confirma. El padre se encarga de persistir
   * el array completo de medios. */
  onConfirm: (item: CompanyPaymentMethodConfig) => Promise<void> | void;
  /** Estado de “guardando” gestionado por el padre. */
  busy?: boolean;
  error?: string | null;
};

const METHOD_OPTIONS: { id: CompanyPaymentMethodId; label: string }[] = (
  Object.keys(COMPANY_PAYMENT_METHOD_LABELS) as CompanyPaymentMethodId[]
).map((id) => ({ id, label: `${COMPANY_PAYMENT_METHOD_LABELS[id]} (${id})` }));

function newClientId(): string {
  if (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as any).crypto?.randomUUID === "function"
  ) {
    return (globalThis as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CompanyPaymentMethodDialog({
  open,
  onClose,
  initial,
  onConfirm,
  busy,
  error,
}: Props) {
  const editing = !!initial;
  const [method, setMethod] = useState<CompanyPaymentMethodId>("CASH");
  const [alias, setAlias] = useState("");
  const [bankAccountKey, setBankAccountKey] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setMethod(initial.method);
      setAlias(initial.alias ?? "");
      setBankAccountKey(initial.bankAccountKey ?? "");
      setIsActive(initial.isActive);
    } else {
      setMethod("CASH");
      setAlias("");
      setBankAccountKey("");
      setIsActive(true);
    }
  }, [open, initial]);

  const title = useMemo(
    () => (editing ? "Editar medio de pago" : "Nuevo medio de pago"),
    [editing],
  );

  async function handleSubmit() {
    const item: CompanyPaymentMethodConfig = {
      id: initial?.id ?? newClientId(),
      method,
      alias: alias.trim() || null,
      displayOrder: initial?.displayOrder ?? 0,
      isActive,
      requireReference: initial?.requireReference ?? false,
      bankAccountKey: bankAccountKey.trim() || null,
      metadata: initial?.metadata ?? null,
    };
    await onConfirm(item);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      size="md"
      scroll="paper"
      hideActions
      data-test-id="company-payment-method-dialog"
    >
      <div className="flex flex-col gap-4 pt-1">
        {error ? (
          <Alert variant="error" data-test-id="company-payment-method-error">
            {error}
          </Alert>
        ) : null}
        <Select
          label="Tipo de medio"
          name="company-payment-method"
          placeholder="Seleccionar"
          options={METHOD_OPTIONS}
          value={method}
          onChange={(id) =>
            setMethod((id != null ? String(id) : "CASH") as CompanyPaymentMethodId)
          }
          alwaysShowLabel
          disabled={busy}
          data-test-id="company-payment-method-select"
        />
        <TextField
          label="Alias (opcional)"
          name="company-payment-method-alias"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Ej. Banco Estado"
          disabled={busy}
          data-test-id="company-payment-method-alias"
        />
        <TextField
          label="Cuenta / banco asociado (opcional)"
          name="company-payment-method-bank"
          value={bankAccountKey}
          onChange={(e) => setBankAccountKey(e.target.value)}
          placeholder="Clave de tesorería"
          disabled={busy}
          data-test-id="company-payment-method-bank"
        />
        <Switch
          checked={isActive}
          onChange={setIsActive}
          disabled={busy}
          label="Activo (la empresa lo acepta)"
          labelPosition="right"
          data-test-id="company-payment-method-active"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => onClose()}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="button"
            loading={busy}
            onClick={() => void handleSubmit()}
            data-test-id="company-payment-method-submit"
          >
            {editing ? "Guardar cambios" : "Agregar"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
