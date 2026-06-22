"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import {
  getEshopOrderAction,
  updateEshopOrderStatusAction,
} from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import type { EShopOrderDetail } from "@/features/e-shop-fulfillment/types/eshop-fulfillment.types";
import {
  FULFILLMENT_STATUS_LABELS,
  NEXT_STATUS_OPTIONS,
} from "@/features/e-shop-fulfillment/lib/eshop-fulfillment-labels";
import LoadingState from "@/shared/components/LoadingState";

export function EShopOrderDetailDialog({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<EShopOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getEshopOrderAction(orderId).then((r) => {
      if (r.success) setOrder(r.order);
      else setError(r.error);
    });
  }, [orderId]);

  const nextStatuses = order ? NEXT_STATUS_OPTIONS[order.fulfillmentStatus] ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Pedido {order?.documentNumber ?? orderId}</h2>
            {order ? (
              <p className="text-sm text-muted-foreground">
                {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        {!order && !error ? <LoadingState className="py-8" label="Cargando pedido" /> : null}
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        {order ? (
          <div className="mt-4 space-y-6">
            <section className="text-sm space-y-1">
              <p>
                <strong>Cliente:</strong> {order.customerName} ({order.customerEmail})
              </p>
              <p>
                <strong>Entrega:</strong> {order.fulfillmentMethodName ?? "—"}
              </p>
              {order.shippingAddress?.line1 ? (
                <p>
                  <strong>Dirección:</strong> {order.shippingAddress.line1}
                </p>
              ) : null}
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2">Líneas</h3>
              <ul className="space-y-1 text-sm">
                {order.lines.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span>
                      {l.productName} × {l.quantity}
                    </span>
                    <span>${Math.round(l.total).toLocaleString("es-CL")}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2">Historial</h3>
              <ol className="space-y-2 text-sm border-l border-border pl-3">
                {(order.statusHistory ?? []).map((h, i) => (
                  <li key={`${h.at}-${i}`}>
                    <span className="font-medium">
                      {FULFILLMENT_STATUS_LABELS[h.status] ?? h.status}
                    </span>
                    <span className="text-muted-foreground"> — {new Date(h.at).toLocaleString("es-CL")}</span>
                    {h.note ? <p className="text-muted-foreground">{h.note}</p> : null}
                  </li>
                ))}
              </ol>
            </section>

            {nextStatuses.length > 0 && !order.isLegacy ? (
              <section className="flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    variant={status === "CANCELLED" ? "ghost" : "primary"}
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      updateEshopOrderStatusAction(order.id, status)
                        .then((r) => {
                          if (r.success) {
                            setOrder(r.order);
                            router.refresh();
                          } else setError(r.error);
                        })
                        .finally(() => setBusy(false));
                    }}
                  >
                    {FULFILLMENT_STATUS_LABELS[status]}
                  </Button>
                ))}
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
