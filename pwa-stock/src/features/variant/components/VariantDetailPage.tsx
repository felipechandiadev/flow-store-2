"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { Barcode } from "lucide-react";
import Link from "next/link";
import { Alert, Button, DotProgress } from "@/shared";
import StorageStockCard from "@/features/stock/components/StorageStockCard";
import { getVariantDetailAction } from "../actions/variant.action";
import { getVariantStockAction, listStoragesAction } from "@/features/stock/actions/stock.action";
import type { VariantDetail } from "../types/variant.types";
import type { StorageOption, VariantStockRow } from "@/features/stock/types/stock.types";
import { SCAN_PATH, variantBarcodePath } from "../lib/variant-routes";

export default function VariantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const variantId = typeof params.variantId === "string" ? params.variantId.trim() : "";

  const [error, setError] = useState("");
  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [stock, setStock] = useState<VariantStockRow | null>(null);
  const [storages, setStorages] = useState<StorageOption[]>([]);
  const [pending, startTransition] = useTransition();

  const loadDetail = useCallback(async (id: string, sku?: string) => {
    setError("");
    const [detailRes, stockRes, storagesRes] = await Promise.all([
      getVariantDetailAction(id),
      getVariantStockAction(id, sku),
      listStoragesAction(),
    ]);
    if (!detailRes.success) {
      setError(detailRes.error);
      setVariant(null);
      setStock(null);
      return;
    }
    setVariant(detailRes.variant);
    if (stockRes.success) {
      setStock(stockRes.row);
    } else {
      setStock(null);
      setError(stockRes.error);
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
        <div className="rounded-lg border border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">SKU</p>
              <p className="font-semibold">{variant.sku}</p>
              <p className="mt-1 text-sm">{variant.productName}</p>
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push(SCAN_PATH)}
            data-test-id="variant-scan-another"
          >
            Escanear otro
          </Button>
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
