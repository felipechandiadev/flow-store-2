"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@/shared/components/IconButton/IconButton";
import { CreatePointOfSaleDialog } from "./CreatePointOfSaleDialog";

/**
 * Controles de “añadir” para CollectionPageLayout: abre el diálogo; el alta pasa por server action.
 */
export function PointsOfSaleCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="ghost"
        size="md"
        ariaLabel="Crear punto de venta"
        onClick={() => setOpen(true)}
        data-test-id="point-of-sale-collection-add"
      />
      <CreatePointOfSaleDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
