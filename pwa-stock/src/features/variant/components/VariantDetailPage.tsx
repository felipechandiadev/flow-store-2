"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Barcode } from "lucide-react";
import Link from "next/link";
import { Alert, DotProgress } from "@/shared";
import StorageStockCard from "@/features/stock/components/StorageStockCard";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import { getVariantDetailAction } from "../actions/variant.action";
import { getVariantStockAction, listStoragesAction } from "@/features/stock/actions/stock.action";
import type { VariantDetail } from "../types/variant.types";
import type { StorageOption, VariantStockRow } from "@/features/stock/types/stock.types";
import { variantBarcodePath } from "../lib/variant-routes";

export default function VariantDetailPage() {
  const params = useParams();
  const variantId = typeof params.variantId === "string" ? params.variantId.trim() : "";

  const [error, setError] = useState("");
  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [stock, setStock] = useState<VariantStockRow | null>(null);
  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [pending, startTransition] = useTransition();

  const loadDetail = useCallback(async (id: string, sku?: string) => {
    setError("");
    const detailRes = await getVariantDetailAction(id);
    if (!detailRes.success) {
      if (handleUnauthorizedClient(detailRes)) {
        return;
      }
      setError(detailRes.error);
      setVariant(null);
      setStock(null);
      return;
    }
    setVariant(detailRes.variant);

    const resolvedSku = sku?.trim() || detailRes.variant.sku;
    const [stockRes, storagesRes] = await Promise.all([
      getVariantStockAction(id, resolvedSku),
      listStoragesAction(),
    ]);
    if (!stockRes.success && handleUnauthorizedClient(stockRes)) {
      return;
    }
    if (stockRes.success) {
      setStock(stockRes.row);
    } else {
      setStock({ variantId: id, productName: "", sku: resolvedSku, stockUnitSymbol: "", storageBreakdown: [] });
    }
    if (!storagesRes.success && handleUnauthorizedClient(storagesRes)) {
      return;
    }
    if (storagesRes.success) {
      setStorages(storagesRes.storages);
    }
  }, []);

  useEffect(() => {
    if (!variantId) return;
    startTransition(() => {
      void loadDetail(variantId);
    });
  }, [variantId, loadDetail]);

  if (!variantId) {
    return <Alert variant="error">Variante no indicada.</Alert>;
  }

  if (pending && !variant) {
    return (
      <div className="flex justify-center py-12">
        <DotProgress />
      </div>
    );
  }

  if (!variant) {
    return error ? <Alert variant="error">{error}</Alert> : null;
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="flex flex-col gap-4">
        <div className="rounded-lg p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">SKU: {variant.sku || "—"}</p>
              <p className="mt-1 text-lg font-semibold leading-snug text-foreground">
                {variant.productName}
              </p>
              {variant.barcode ? (
                <p className="mt-1 text-xs text-muted-foreground">Código: {variant.barcode}</p>
              ) : null}
              {Object.keys(variant.attributeValues).length > 0 ? (
                <ul className="mt-2 text-xs text-muted-foreground">
                  {Object.entries(variant.attributeValues).map(([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Link
              href={variantBarcodePath(variant.variantId)}
              className="shrink-0 rounded-lg border border-border p-2"
              aria-label="Actualizar código de barras"
            >
              <Barcode size={20} />
            </Link>
          </div>
        </div>

        {stock?.storageBreakdown.length ? (
          <div className="flex flex-col gap-3">
            {stock.storageBreakdown.map((s) => (
              <StorageStockCard
                key={s.storageId}
                variantId={variant.variantId}
                storage={s}
                allStorages={storages}
                onUpdated={() => void loadDetail(variant.variantId, variant.sku)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin stock registrado en almacenes.</p>
        )}
      </section>
    </div>
  );
}
