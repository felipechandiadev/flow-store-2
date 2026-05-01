"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import type { Option } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import type {
  ExpenseCategoryOperationalGroupValue,
  OperationalGroupMetaItem,
} from "@/features/expense-categories/types/expense-category.types";
import { createExpenseCategoryAction } from "@/features/expense-categories/actions/expense-category.action";

export type CreateExpenseCategoryDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  groupOptions: OperationalGroupMetaItem[];
};

export function CreateExpenseCategoryDialog({
  open,
  onClose,
  onSuccess,
  groupOptions,
}: CreateExpenseCategoryDialogProps) {
  const defaultGroup = groupOptions[0]?.value ?? "PERDIDAS_AJUSTES_OPERATIVOS";
  const [name, setName] = useState("");
  const [operationalExpenseGroup, setOperationalExpenseGroup] =
    useState<ExpenseCategoryOperationalGroupValue>(defaultGroup);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectOptions: Option[] = useMemo(
    () => groupOptions.map((g) => ({ id: g.value, label: g.label })),
    [groupOptions],
  );

  const groupDescription = useMemo(() => {
    const m = groupOptions.find((g) => g.value === operationalExpenseGroup);
    return m?.description ?? "";
  }, [groupOptions, operationalExpenseGroup]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setOperationalExpenseGroup(groupOptions[0]?.value ?? "PERDIDAS_AJUSTES_OPERATIVOS");
    setDescription("");
    setIsActive(true);
    setError(null);
  }, [open, groupOptions]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createExpenseCategoryAction({
          name: name.trim(),
          operationalExpenseGroup,
          description: description.trim() || undefined,
          requiresApproval: false,
          approvalThreshold: 0,
          isActive,
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

  const canSubmit = Boolean(name.trim() && groupOptions.length > 0 && !isPending);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear categoría de gasto"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="expense-category-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="expense-category-create-error">
            {error}
          </Alert>
        ) : groupOptions.length === 0 ? (
          <Alert variant="warning" data-test-id="expense-category-create-no-groups">
            No se pudieron cargar los grupos operativos. Revise la API o vuelva a intentar.
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="expense-category-create-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="expense-category-create-submit">
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="ec-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre visible"
          required
          data-test-id="expense-category-create-name"
        />
        <Select
          label="Grupo operativo"
          name="ec-create-group-enum"
          value={operationalExpenseGroup}
          onChange={(id) => setOperationalExpenseGroup(String(id) as ExpenseCategoryOperationalGroupValue)}
          options={selectOptions}
          required
          data-test-id="expense-category-create-group"
        />
        {groupDescription ? (
          <p className="text-xs leading-relaxed text-muted-foreground" data-test-id="expense-category-create-group-desc">
            {groupDescription}
          </p>
        ) : null}
        <TextField
          label="Descripción (opcional)"
          name="ec-create-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          data-test-id="expense-category-create-desc"
        />
        <Switch
          checked={isActive}
          onChange={setIsActive}
          label="Activa"
          labelPosition="right"
          data-test-id="expense-category-create-active"
        />
      </div>
    </Dialog>
  );
}
