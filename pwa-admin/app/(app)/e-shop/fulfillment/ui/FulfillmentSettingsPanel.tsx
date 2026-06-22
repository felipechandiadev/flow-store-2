"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { updateFulfillmentSettingsAction } from "@/features/e-shop-fulfillment/actions/eshop-fulfillment.action";
import type { EShopFulfillmentSettings, EShopStockPolicy } from "@/features/e-shop-fulfillment/types/eshop-fulfillment.types";
import { STOCK_POLICY_LABELS } from "@/features/e-shop-fulfillment/lib/eshop-fulfillment-labels";

export function FulfillmentSettingsPanel({
  initialSettings,
}: {
  initialSettings: EShopFulfillmentSettings;
}) {
  const router = useRouter();
  const [policy, setPolicy] = useState<EShopStockPolicy>(initialSettings.eShopStockPolicy);
  const [threshold, setThreshold] = useState(
    initialSettings.eShopFreeShippingThreshold != null
      ? String(initialSettings.eShopFreeShippingThreshold)
      : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-xl space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Política de stock en checkout</h2>
        <p className="text-sm text-muted-foreground">
          Define qué ocurre cuando un cliente pide más unidades de las disponibles en el almacén eShop.
        </p>
        <div className="space-y-2">
          {(Object.keys(STOCK_POLICY_LABELS) as EShopStockPolicy[]).map((key) => (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="stockPolicy"
                checked={policy === key}
                onChange={() => setPolicy(key)}
                className="mt-1"
              />
              <span>{STOCK_POLICY_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <TextField
          label="Umbral envío gratis global (CLP)"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          helperText="Usado por métodos FREE_OVER_THRESHOLD sin umbral propio."
        />
      </section>

      <section className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
        <p>
          Almacén eShop:{" "}
          <strong className="text-foreground">
            {initialSettings.eShopDefaultStorageId ?? "No configurado"}
          </strong>
        </p>
        <p className="mt-1">
          Sucursal default:{" "}
          <strong className="text-foreground">
            {initialSettings.eShopDefaultBranchId ?? "No configurada"}
          </strong>
        </p>
        <p className="mt-2 text-xs">Configure almacén y sucursal en Ajustes de empresa / eShop.</p>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        variant="primary"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          updateFulfillmentSettingsAction({
            eShopStockPolicy: policy,
            eShopFreeShippingThreshold: threshold ? Number(threshold) : null,
          })
            .then((r) => {
              if (!r.success) setError(r.error);
              else router.refresh();
            })
            .finally(() => setBusy(false));
        }}
      >
        Guardar configuración
      </Button>
    </div>
  );
}
