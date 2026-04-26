"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tags } from "lucide-react";
import { Card } from "@/shared/components/Cards";
import { DeleteDialog } from "@/shared/components/Dialog/DeleteDialog";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { PRICE_LIST_TYPE_OPTIONS } from "@/features/sales-price-lists/types/price-list.types";
import { deletePriceListAction } from "@/features/sales-price-lists/actions/price-list.action";
import { UpdatePriceListDialog } from "./UpdatePriceListDialog";

type PriceListCardProps = {
  priceList: PriceListListItem;
  "data-test-id"?: string;
};

function typeLabel(t: string): string {
  return PRICE_LIST_TYPE_OPTIONS.find((o) => o.id === t)?.label ?? t;
}

export function PriceListCard({ priceList, "data-test-id": dataTestId }: PriceListCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const subtitle = typeLabel(priceList.priceListType);

  const media = (
    <div
      className="flex min-h-28 w-full items-center justify-center bg-neutral-100"
      data-test-id="price-list-card-media"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-border">
        <Tags className="h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden />
      </div>
    </div>
  );

  return (
    <>
      <Card
        data-test-id={dataTestId}
        media={media}
        title={priceList.name}
        subtitle={subtitle}
        content={
          <div className="flex flex-col gap-2 text-sm" data-test-id="price-list-card-details">
            <p className="text-foreground">
              {priceList.isActive ? "Activa" : "Inactiva"}
              {priceList.isDefault ? (
                <span className="text-muted"> · Preferente</span>
              ) : null}
            </p>
            {priceList.description ? (
              <p className="line-clamp-2 text-muted">{priceList.description}</p>
            ) : null}
          </div>
        }
        actions={[
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar lista de precio",
            onClick: () => setUpdateOpen(true),
            "data-test-id": "price-list-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar lista de precio",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "price-list-card-delete",
          },
        ]}
      />
      <UpdatePriceListDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        priceList={priceList}
        onSuccess={async () => {
          await router.refresh();
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteOpen(false);
            setDeleteErrors([]);
          }
        }}
        title="Eliminar lista de precio"
        message={
          <>
            ¿Eliminar la lista <strong className="font-semibold">«{priceList.name}»</strong>? Esta acción
            no se puede deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deletePriceListAction(priceList.id);
              if (r.success) {
                setDeleteOpen(false);
                await router.refresh();
              } else {
                setDeleteErrors([r.error]);
              }
            } finally {
              setIsDeleting(false);
            }
          })();
        }}
        data-test-id={`${dataTestId ?? "price-list-card"}-delete-dialog`}
      />
    </>
  );
}
