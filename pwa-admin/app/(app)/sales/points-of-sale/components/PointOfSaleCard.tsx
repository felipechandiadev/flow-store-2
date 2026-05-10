"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarClock, Cpu, Tags } from "lucide-react";
import { CashRegisterIcon } from "./CashRegisterIcon";
import { Card } from "@/shared/components/Cards";
import { DeleteDialog } from "@/shared/components/Dialog/DeleteDialog";
import Badge from "@/shared/components/Badge/Badge";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { deletePointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";
import { UpdatePointOfSaleDialog } from "./UpdatePointOfSaleDialog";

type PointOfSaleCardProps = {
  point: PointOfSaleListItem;
  branches: BranchListItem[];
  priceListCatalog: PriceListListItem[];
  "data-test-id"?: string;
};

function formatShortDate(value?: string) {
  if (value == null || value === "") {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PointOfSaleCard({
  point,
  branches,
  priceListCatalog,
  "data-test-id": dataTestId,
}: PointOfSaleCardProps) {
  const router = useRouter();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteErrors, setDeleteErrors] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const listCount = point.priceLists?.length ?? 0;

  const createdLabel = formatShortDate(point.createdAt);
  const updatedLabel = formatShortDate(point.updatedAt);

  const headerEnd = (
    <span data-test-id="pos-card-active-label" className="shrink-0">
      <Badge variant={point.isActive ? "success" : "secondary-outlined"}>
        {point.isActive ? "Activo" : "Inactivo"}
      </Badge>
    </span>
  );

  const media = (
    <div
      className="relative flex min-h-[7.5rem] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/[0.12] via-secondary/25 to-accent/15"
      data-test-id="pos-card-media"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-secondary/30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-secondary bg-white/90 shadow-md backdrop-blur-sm">
        <CashRegisterIcon className="h-9 w-9 shrink-0 text-primary" />
      </div>
    </div>
  );

  const content = (
    <div className="space-y-3" data-test-id="pos-card-body">
      <div className="rounded-lg border border-border/80 bg-gradient-to-b from-background to-neutral/40 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-secondary">
          <Building2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Sucursal
        </p>
        <p className="text-sm font-medium leading-snug text-foreground" data-test-id="pos-card-branch">
          {point.branch?.name ?? "—"}
        </p>
      </div>

      <div className="rounded-lg border border-border/60 px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Cpu className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          ID de dispositivo
        </p>
        {point.deviceId && String(point.deviceId).trim() ? (
          <p
            className="break-all font-mono text-xs text-foreground"
            data-test-id="pos-card-device"
          >
            {String(point.deviceId).trim()}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No asignado</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-primary">
          <Tags className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Listas de precio
        </p>
        {listCount === 0 ? (
          <p className="text-sm text-muted-foreground" data-test-id="pos-card-lists-empty">
            Ninguna lista asignada
          </p>
        ) : (
          <div
            className="flex flex-wrap gap-1.5"
            data-test-id="pos-card-price-list-badges"
          >
            {point.priceLists.map((pl) => {
              const isPreferente = pl.id === point.defaultPriceListId;
              return (
                <span key={pl.id} title={pl.name} className="inline-block max-w-full">
                  <Badge
                    variant={isPreferente ? "primary" : "info-outlined"}
                    className="max-w-full truncate"
                  >
                    {isPreferente ? "★ " : ""}
                    {pl.name}
                    {!pl.isActive ? " · inactiva" : ""}
                  </Badge>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {(createdLabel || updatedLabel) && (
        <div
          className="flex flex-wrap items-center gap-1 border-t border-border/70 pt-2.5 text-[0.7rem] text-muted-foreground"
          data-test-id="pos-card-dates"
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2} aria-hidden />
          {createdLabel ? <span>Creado {createdLabel}</span> : null}
          {updatedLabel && updatedLabel !== createdLabel ? (
            <span>
              {createdLabel ? " · " : null}
              Actualizado {updatedLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card
        className="overflow-hidden border-border/90 shadow-sm transition-shadow duration-200 hover:shadow-md"
        data-test-id={dataTestId}
        media={media}
        title={point.name}
        headerEnd={headerEnd}
        content={content}
        actions={[
          {
            id: "payment-methods",
            icon: "CreditCard",
            ariaLabel: "Medios de pago",
            onClick: () =>
              router.push(`/sales/points-of-sale/${point.id}/payment-methods`),
            "data-test-id": "pos-card-payment-methods",
          },
          {
            id: "update",
            icon: "Pencil",
            ariaLabel: "Actualizar punto de venta",
            onClick: () => {
              setUpdateOpen(true);
            },
            "data-test-id": "pos-card-update",
          },
          {
            id: "delete",
            icon: "Trash2",
            ariaLabel: "Eliminar punto de venta",
            disabled: isDeleting,
            onClick: () => {
              setDeleteErrors([]);
              setDeleteOpen(true);
            },
            "data-test-id": "pos-card-delete",
          },
        ]}
      />
      <UpdatePointOfSaleDialog
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        point={point}
        branches={branches}
        priceListCatalog={priceListCatalog}
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
        title="Eliminar punto de venta"
        message={
          <>
            ¿Eliminar el punto de venta <strong className="font-semibold">«{point.name}»</strong>? Esta
            acción no se puede deshacer.
          </>
        }
        errors={deleteErrors}
        isSubmitting={isDeleting}
        onConfirm={() => {
          setDeleteErrors([]);
          setIsDeleting(true);
          void (async () => {
            try {
              const r = await deletePointOfSaleAction(point.id);
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
        data-test-id={`${dataTestId ?? "pos-card"}-delete-dialog`}
      />
    </>
  );
}
