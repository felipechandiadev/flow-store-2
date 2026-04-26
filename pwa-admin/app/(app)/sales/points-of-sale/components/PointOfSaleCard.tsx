"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/shared/components/Cards";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import { deletePointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";

type PointOfSaleCardProps = {
  point: PointOfSaleListItem;
  "data-test-id"?: string;
};

export function PointOfSaleCard({ point, "data-test-id": dataTestId }: PointOfSaleCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const subtitleParts = [point.branch?.name, point.deviceId || null].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : "—";

  return (
    <Card
      data-test-id={dataTestId}
      title={point.name}
      subtitle={subtitle}
      content={
        <p className="text-sm text-muted">
          {point.isActive ? "Activo" : "Inactivo"}
        </p>
      }
      actions={[
        {
          id: "update",
          icon: "Pencil",
          ariaLabel: "Actualizar punto de venta",
          onClick: () => {
            /* flujo de actualización en otra tarea; misma feature */
          },
          "data-test-id": "pos-card-update",
        },
        {
          id: "delete",
          icon: "Trash2",
          ariaLabel: "Eliminar punto de venta",
          disabled: isPending,
          onClick: () => {
            if (typeof window === "undefined") return;
            if (!window.confirm("¿Eliminar este punto de venta?")) return;
            startTransition(() => {
              void (async () => {
                const r = await deletePointOfSaleAction(point.id);
                if (r.success) {
                  router.refresh();
                } else {
                  window.alert(r.error);
                }
              })();
            });
          },
          "data-test-id": "pos-card-delete",
        },
      ]}
    />
  );
}
