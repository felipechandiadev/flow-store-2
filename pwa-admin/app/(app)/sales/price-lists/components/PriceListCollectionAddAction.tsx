"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@/shared/components/IconButton/IconButton";
import { CreatePriceListDialog } from "./CreatePriceListDialog";

export function PriceListCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="ghost"
        size="md"
        ariaLabel="Crear lista de precio"
        onClick={() => setOpen(true)}
        data-test-id="price-lists-collection-add"
      />
      <CreatePriceListDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
