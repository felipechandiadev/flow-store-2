"use client";

import { useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { createPointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";

export type CreatePointOfSaleDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Tras crear correctamente: revalidación y `router.refresh()` desde la página. */
  onSuccess?: () => void;
};

/**
 * Diálogo de creación; envío vía server action (use case + API + revalidatePath).
 */
export function CreatePointOfSaleDialog({ open, onClose, onSuccess }: CreatePointOfSaleDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setName("");
    setCode("");
    setNotes("");
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createPointOfSaleAction({
          name: name.trim(),
          code: code.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        if (r.success) {
          onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Crear punto de venta"
      size="md"
      data-test-id="point-of-sale-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="pos-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="pos-create-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            data-test-id="pos-create-submit"
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="pos-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="pos-create-name"
        />
        <TextField
          label="Código (opcional)"
          name="pos-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código (opcional)"
          data-test-id="pos-create-code"
        />
        <TextField
          label="Notas (opcional)"
          name="pos-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (opcional)"
          rows={3}
          data-test-id="pos-create-notes"
        />
      </div>
    </Dialog>
  );
}
