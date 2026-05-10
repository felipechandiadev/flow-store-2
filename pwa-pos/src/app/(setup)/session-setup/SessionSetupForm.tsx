"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PointOfSaleListItem, PosPriceList } from "@/features/session/types/point-of-sale.types";
import type { CashSessionListItem } from "@/features/session/types/cash-session.types";
import { openCashSessionAction } from "@/features/session/actions/session-setup.action";
import { listOpenCashSessionsAction } from "@/features/session/actions/cash-session.action";
import { Alert, Button, Dialog, Select, TextField } from "@/shared/admin-shared";
import { savePosContextClient, type PosPriceListSnapshot } from "@/features/session/lib/pos-context-storage";

export type MyOpenSession = {
  cashSessionId: string;
  pointOfSaleId: string;
  pointOfSaleName: string | null;
  branchName: string | null;
};

type Props = {
  pointsOfSale: PointOfSaleListItem[];
  initialError?: string;
  myOpenSession?: MyOpenSession | null;
};

type BranchOption = { id: string; name: string };

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

function getBranchId(p: PointOfSaleListItem): string | null {
  return p.branchId ?? p.branch?.id ?? null;
}

function getBranchName(p: PointOfSaleListItem): string | null {
  return p.branch?.name ?? null;
}

function buildPosContextFromPos(pos: PointOfSaleListItem) {
  const availablePriceLists: PosPriceList[] = pos.priceLists ?? [];
  const defaultPriceListId =
    pos.defaultPriceListId && availablePriceLists.some((p) => p.id === pos.defaultPriceListId)
      ? pos.defaultPriceListId
      : availablePriceLists[0]?.id ?? "";
  return {
    pointOfSaleId: pos.id,
    pointOfSaleName: pos.name,
    branchName: pos.branch?.name ?? null,
    branchId: pos.branchId ?? pos.branch?.id ?? null,
    priceListId: defaultPriceListId || null,
    priceLists: availablePriceLists.map((p) => ({ id: p.id, name: p.name })),
  };
}

export default function SessionSetupForm({
  pointsOfSale,
  initialError = "",
  myOpenSession = null,
}: Props) {
  if (myOpenSession) {
    return <MyOpenSessionPanel pointsOfSale={pointsOfSale} myOpenSession={myOpenSession} />;
  }
  return <NewSessionForm pointsOfSale={pointsOfSale} initialError={initialError} />;
}

// -----------------------------------------------------------------------------
// Panel: el usuario ya tiene una sesión de caja abierta.
// -----------------------------------------------------------------------------
function MyOpenSessionPanel({
  pointsOfSale,
  myOpenSession,
}: {
  pointsOfSale: PointOfSaleListItem[];
  myOpenSession: MyOpenSession;
}) {
  const router = useRouter();
  const myPos = pointsOfSale.find((p) => p.id === myOpenSession.pointOfSaleId) ?? null;

  const handleContinue = () => {
    if (myPos) {
      savePosContext(buildPosContextFromPos(myPos));
    } else {
      savePosContext({
        pointOfSaleId: myOpenSession.pointOfSaleId,
        pointOfSaleName: myOpenSession.pointOfSaleName,
        branchName: myOpenSession.branchName,
      });
    }
    router.push("/pos");
  };

  const handleClose = () => {
    router.push("/cash/closing");
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight">Sesión de caja</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Tienes una sesión de caja abierta. ¿Quieres continuarla o cerrarla?
      </p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Sesión abierta</h2>
        <dl className="mt-2 grid gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Sucursal</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {myOpenSession.branchName ?? myPos?.branch?.name ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Punto de venta</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {myOpenSession.pointOfSaleName ?? myPos?.name ?? "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" variant="outlined" onClick={handleClose}>
          Cerrar sesión de caja
        </Button>
        <Button type="button" onClick={handleContinue}>
          Continuar sesión de caja
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Form: el usuario NO tiene sesión propia abierta. Permite seleccionar
// sucursal + punto de venta y abrir una nueva sesión.
// -----------------------------------------------------------------------------
function NewSessionForm({
  pointsOfSale,
  initialError,
}: {
  pointsOfSale: PointOfSaleListItem[];
  initialError: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const branches: BranchOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pointsOfSale) {
      const id = getBranchId(p);
      const name = getBranchName(p);
      if (id && !map.has(id)) {
        map.set(id, name ?? id);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [pointsOfSale]);

  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [pointOfSaleId, setPointOfSaleId] = useState<string>("");

  const pointsOfSaleForBranch = useMemo(
    () => pointsOfSale.filter((p) => getBranchId(p) === branchId),
    [pointsOfSale, branchId],
  );

  const selectedPos = useMemo(
    () => pointsOfSaleForBranch.find((p) => p.id === pointOfSaleId) ?? null,
    [pointsOfSaleForBranch, pointOfSaleId],
  );

  const availablePriceLists: PosPriceList[] = selectedPos?.priceLists ?? [];
  const defaultPriceListId =
    selectedPos?.defaultPriceListId && availablePriceLists.some((p) => p.id === selectedPos.defaultPriceListId)
      ? selectedPos.defaultPriceListId
      : availablePriceLists[0]?.id ?? "";
  const defaultPriceListName =
    availablePriceLists.find((p) => p.id === defaultPriceListId)?.name ?? null;

  const [openSessions, setOpenSessions] = useState<CashSessionListItem[]>([]);
  const [loadingOpenSessions, setLoadingOpenSessions] = useState<boolean>(false);

  const refreshOpenSessions = async () => {
    setLoadingOpenSessions(true);
    try {
      const res = await listOpenCashSessionsAction();
      if (res.success) {
        setOpenSessions(res.items);
      }
    } finally {
      setLoadingOpenSessions(false);
    }
  };

  useEffect(() => {
    refreshOpenSessions();
  }, []);

  const openSessionForSelectedPos = useMemo(
    () => (pointOfSaleId ? openSessions.find((s) => s.pointOfSaleId === pointOfSaleId) ?? null : null),
    [openSessions, pointOfSaleId],
  );
  const hasOpenSessionForPos = openSessionForSelectedPos !== null;

  const handleBranchChange = (nextId: string) => {
    setBranchId(nextId);
    setPointOfSaleId("");
  };

  const [isOpenAmountDialog, setIsOpenAmountDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>("0");
  const [error, setError] = useState<string>(initialError);

  const canSubmitOpening =
    !isPending &&
    pointOfSaleId.trim() !== "" &&
    openingAmount.trim() !== "" &&
    Number.isFinite(Number(openingAmount)) &&
    Number(openingAmount) >= 0;

  const handleConfirmOpen = () => {
    setError("");
    if (!canSubmitOpening) return;

    startTransition(async () => {
      const result = await openCashSessionAction({
        pointOfSaleId,
        openingAmount,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (selectedPos) {
        savePosContext(buildPosContextFromPos(selectedPos));
      }

      setIsOpenAmountDialog(false);
      router.push("/pos");
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight">Sesión de caja</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Selecciona la sucursal y el punto de venta para abrir una sesión de caja.
      </p>

      <div className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <Select
            label="Sucursal"
            placeholder="Sucursal"
            value={branchId || null}
            onChange={(id) => handleBranchChange(id ? String(id) : "")}
            options={branches.map((b) => ({ id: b.id, label: b.name }))}
            required
            disabled={branches.length === 0}
          />
          {branches.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              No hay sucursales con puntos de venta asignados a este usuario.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Select
            label="Punto de venta"
            placeholder="Punto de venta"
            value={pointOfSaleId || null}
            onChange={(id) => setPointOfSaleId(id ? String(id) : "")}
            options={pointsOfSaleForBranch.map((p) => ({ id: p.id, label: p.name }))}
            required
            disabled={!branchId || pointsOfSaleForBranch.length === 0}
          />
          {branchId && pointsOfSaleForBranch.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              No hay puntos de venta para esta sucursal.
            </p>
          ) : null}
        </div>

        {selectedPos ? (
          <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Resumen</h2>
            <dl className="mt-2 grid gap-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Sucursal</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedPos.branch?.name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Punto de venta</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{selectedPos.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Lista de precios</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  {defaultPriceListName ?? "Sin lista de precios asignada"}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {error ? <Alert variant="error">{error}</Alert> : null}

        {selectedPos ? (
          hasOpenSessionForPos ? (
            <Alert variant="info">
              Ya existe una sesión de caja abierta para este punto de venta
              {openSessionForSelectedPos?.openedByFullName
                ? ` (abierta por ${openSessionForSelectedPos.openedByFullName})`
                : ""}
              .
            </Alert>
          ) : (
            <Button
              type="button"
              onClick={() => {
                setError("");
                setOpeningAmount("0");
                setIsOpenAmountDialog(true);
              }}
              disabled={loadingOpenSessions}
            >
              Abrir nueva sesión de caja
            </Button>
          )
        ) : null}
      </div>

      <Dialog
        open={isOpenAmountDialog}
        onClose={() => {
          if (!isPending) setIsOpenAmountDialog(false);
        }}
        title="Abrir sesión de caja"
        size="sm"
        showCloseButton
        actionsJustify="end"
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpenAmountDialog(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmOpen}
              disabled={!canSubmitOpening}
              loading={isPending}
            >
              Abrir sesión de caja
            </Button>
          </div>
        }
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
      >
        <div className="grid gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Indica el monto de apertura en efectivo para iniciar la sesión de caja del punto de venta{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedPos?.name}</span>.
          </p>
          <TextField
            label="Monto de apertura"
            placeholder="0"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </Dialog>
    </div>
  );
}
