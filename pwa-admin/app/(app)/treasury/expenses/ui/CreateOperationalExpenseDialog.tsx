"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import type { Option } from "@/shared/components/Select";
import { createOperationalExpenseAction } from "@/features/treasury-expenses/actions/operational-expense.action";
import type {
  ExpenseCategoryOption,
  SupplierOption,
} from "@/features/treasury-expenses/types/operational-expense.types";

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

export function CreateOperationalExpenseDialog({
  open,
  onClose,
  onSuccess,
  categoryOptions,
  supplierOptions,
}: CreateOperationalExpenseDialogProps) {
  const [name, setName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [operationDate, setOperationDate] = useState(isoDateToday());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectOptions: Option[] = useMemo(
    () => categoryOptions.map((c) => ({ id: c.id, label: c.name })),
    [categoryOptions],
  );
  const supplierSelectOptions: Option[] = useMemo(
    () => supplierOptions.map((s) => ({ id: s.id, label: s.name })),
    [supplierOptions],
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
  }, [open, categoryOptions]);

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
        const r = await createOperationalExpenseAction({
          name: name.trim(),
          categoryId,
          referenceNumber: referenceNumber.trim() || undefined,
          operationDate,
          description,
          supplierId: supplierId || undefined,
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

  const canSubmit = Boolean(name.trim() && categoryId && operationDate && !isPending);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear gasto operativo"
      size="md"
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
          <Button variant="primary" size="md" onClick={submit} disabled={!canSubmit}>
            Crear
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

        <Select
          label="Proveedor (opcional)"
          name="operating-expense-supplier"
          value={supplierId}
          onChange={(id) => setSupplierId(id == null ? null : String(id))}
          options={supplierSelectOptions}
          placeholder="Proveedor (opcional)"
          allowClear
          data-test-id="operational-expense-supplier"
        />

        <TextField
          label="Fecha de operación"
          name="operating-expense-operation-date"
          type="date"
          value={operationDate}
          onChange={(e) => setOperationDate(e.target.value)}
          required
          placeholder="Fecha de operación"
          data-test-id="operational-expense-date"
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

