"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PointOfSaleListItem, PosPriceList } from "@/features/session/types/point-of-sale.types";
import { openCashSessionAction } from "@/features/session/actions/session-setup.action";
import { Alert, Button, Select, TextField } from "@/shared/admin-shared";
import { savePosContextClient, type PosPriceListSnapshot } from "@/features/session/lib/pos-context-storage";

type Props = {
  pointsOfSale: PointOfSaleListItem[];
  initialError?: string;
};

function savePosContext(input: {
  pointOfSaleId: string;
  pointOfSaleName?: string | null;
  branchName?: string | null;
  priceListId?: string | null;
  branchId?: string | null;
  priceLists?: PosPriceListSnapshot[];
}) {
  savePosContextClient({
    pointOfSaleId: input.pointOfSaleId,
    pointOfSaleName: input.pointOfSaleName ?? null,
    branchName: input.branchName ?? null,
    priceListId: input.priceListId ?? null,
    branchId: input.branchId ?? null,
    priceLists: input.priceLists ?? [],
  });
}

export default function SessionSetupForm({ pointsOfSale, initialError = "" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [pointOfSaleId, setPointOfSaleId] = useState<string>(pointsOfSale[0]?.id ?? "");
  const selectedPos = useMemo(
    () => pointsOfSale.find((p) => p.id === pointOfSaleId) ?? null,
    [pointsOfSale, pointOfSaleId],
  );

  const availablePriceLists: PosPriceList[] = selectedPos?.priceLists ?? [];
  const defaultPriceListId =
    selectedPos?.defaultPriceListId && availablePriceLists.some((p) => p.id === selectedPos.defaultPriceListId)
      ? selectedPos.defaultPriceListId
      : availablePriceLists[0]?.id ?? "";

  const [openingAmount, setOpeningAmount] = useState<string>("0");
  const [error, setError] = useState<string>(initialError);

  const handlePosChange = (nextId: string) => {
    setPointOfSaleId(nextId);
  };

  const canSubmit =
    !isPending &&
    pointOfSaleId.trim() !== "" &&
    openingAmount.trim() !== "" &&
    Number.isFinite(Number(openingAmount)) &&
    Number(openingAmount) >= 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight">Configurar sesión</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Selecciona el punto de venta y abre tu sesión de caja para comenzar.
      </p>

      <form
        className="mt-6 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (!canSubmit) return;

          startTransition(async () => {
            const result = await openCashSessionAction({
              pointOfSaleId,
              openingAmount,
            });

            if (!result.success) {
              setError(result.error);
              return;
            }

            // priceListId se deriva del POS (no se selecciona al abrir sesión de caja)
            savePosContext({
              pointOfSaleId,
              pointOfSaleName: selectedPos?.name ?? null,
              branchName: selectedPos?.branch?.name ?? null,
              priceListId: defaultPriceListId || null,
              branchId: selectedPos?.branchId ?? null,
              priceLists: availablePriceLists.map((p) => ({ id: p.id, name: p.name })),
            });
            router.push("/pos");
          });
        }}
      >
        <div className="grid gap-2">
          <Select
            label="Punto de venta"
            placeholder="Punto de venta"
            value={pointOfSaleId || null}
            onChange={(id) => handlePosChange(id ? String(id) : "")}
            options={pointsOfSale.map((p) => ({
              id: p.id,
              label: `${p.name}${p.branch?.name ? ` — ${p.branch.name}` : ""}`,
            }))}
            required
            disabled={pointsOfSale.length === 0}
          />
          {pointsOfSale.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              No hay puntos de venta disponibles para este usuario o no se pudieron cargar.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <TextField
            label="Lista de precios"
            placeholder="Lista de precios"
            value={
              availablePriceLists.find((p) => p.id === defaultPriceListId)?.name ||
              (availablePriceLists.length === 0 ? "Sin listas de precios" : "")
            }
            onChange={() => {}}
            readOnly
          />
          {availablePriceLists.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Este punto de venta no tiene listas de precio asignadas. Configúralas en el admin.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <TextField
            label="Monto de apertura"
            placeholder="Monto de apertura"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>

        {error ? (
          <Alert variant="error">{error}</Alert>
        ) : null}

        <Button type="submit" disabled={!canSubmit} loading={isPending}>
          Abrir sesión
        </Button>
      </form>
    </div>
  );
}

