"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@/shared/components/IconButton/IconButton";
import { CreateUserDialog } from "./CreateUserDialog";

export function UsersCollectionAddAction() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <IconButton
        icon="Plus"
        variant="ghost"
        size="md"
        ariaLabel="Crear usuario"
        onClick={() => setOpen(true)}
        data-test-id="users-collection-add"
      />
      <CreateUserDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
    </>
  );
}
