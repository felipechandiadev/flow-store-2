"use client";

import { Button } from "@/shared/components/Button";

export type CreateReceiptPlaceholderFormProps = {
  onClose?: () => void;
};

export function CreateReceiptPlaceholderForm({ onClose }: CreateReceiptPlaceholderFormProps) {
  return (
    <div className="grid gap-4" data-test-id="create-receipt-placeholder-form">
      <p className="text-sm text-muted-foreground">
        El registro de boletas de proveedor (DTE tipo boleta) aún no está conectado al backend. Próximamente podrás
        crearlas desde aquí.
      </p>
      <div className="flex justify-end">
        <Button variant="secondary" type="button" onClick={() => onClose?.()}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
