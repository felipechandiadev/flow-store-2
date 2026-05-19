"use client";

import { useState } from "react";
import { Card } from "@/shared/components/Cards";
import { Alert, Button, Dialog, Select, TextField } from "@/shared";
import type { Option as SelectOption } from "@/shared/Select/Select";
import type { StockStorageBreakdown, StorageOption } from "../types/stock.types";
import { handleUnauthorizedClient } from "@/lib/auth/handle-unauthorized";
import { adjustStockAction, transferStockAction } from "../actions/stock.action";

type StorageStockCardProps = {
  variantId: string;
  storage: StockStorageBreakdown;
  allStorages: StorageOption[];
  onUpdated: () => void;
};

export default function StorageStockCard({
  variantId,
  storage,
  allStorages,
  onUpdated,
}: StorageStockCardProps) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [targetQty, setTargetQty] = useState(String(storage.quantity));
  const [transferQty, setTransferQty] = useState("1");
  const [targetStorageId, setTargetStorageId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const storageOptions: SelectOption[] = allStorages
    .filter((s) => s.id !== storage.storageId)
    .map((s) => ({
      id: s.id,
      label: s.branchName ? `${s.name} (${s.branchName})` : s.name,
    }));

  const runAdjust = async (target: number) => {
    setBusy(true);
    setError("");
    const r = await adjustStockAction({
      variantId,
      storageId: storage.storageId,
      currentQuantity: storage.quantity,
      targetQuantity: target,
    });
    setBusy(false);
    if (!r.success) {
      if (handleUnauthorizedClient(r)) {
        return false;
      }
      setError(r.error);
      return false;
    }
    onUpdated();
    return true;
  };

  const handleQuickDelta = async (delta: number) => {
    const target = Math.max(0, storage.quantity + delta);
    await runAdjust(target);
  };

  const handleRecount = async () => {
    const target = Number(String(targetQty).replace(",", "."));
    if (!Number.isFinite(target) || target < 0) {
      setError("Cantidad inválida");
      return;
    }
    const ok = await runAdjust(target);
    if (ok) setAdjustOpen(false);
  };

  const handleTransfer = async () => {
    const qty = Number(String(transferQty).replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Cantidad inválida");
      return;
    }
    if (!targetStorageId) {
      setError("Seleccione almacén destino");
      return;
    }
    setBusy(true);
    setError("");
    const r = await transferStockAction({
      variantId,
      sourceStorageId: storage.storageId,
      targetStorageId,
      quantity: qty,
    });
    setBusy(false);
    if (!r.success) {
      if (handleUnauthorizedClient(r)) {
        return;
      }
      setError(r.error);
      return;
    }
    setTransferOpen(false);
    onUpdated();
  };

  const openRecount = () => {
    setTargetQty(String(storage.quantity));
    setError("");
    setAdjustOpen(true);
  };

  return (
    <>
      <Card
        data-test-id={`storage-card-${storage.storageId}`}
        title={storage.storageName}
        subtitle={storage.branchName ?? undefined}
        content={
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Físico</dt>
            <dd className="text-right font-mono font-semibold tabular-nums text-foreground">
              {storage.quantity}
            </dd>
            <dt className="text-muted-foreground">Reservado</dt>
            <dd className="text-right font-mono tabular-nums text-foreground">
              {storage.reservedStock}
            </dd>
            <dt className="text-muted-foreground">Disponible</dt>
            <dd
              className={`text-right font-mono font-semibold tabular-nums ${
                storage.availableStock < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {storage.availableStock}
            </dd>
          </dl>
        }
        actions={[
          {
            id: "recount",
            icon: "RefreshCcw",
            ariaLabel: "Reconteo",
            onClick: openRecount,
            disabled: busy,
            "data-test-id": `storage-recount-${storage.storageId}`,
          },
          {
            id: "decrease",
            icon: "Minus",
            ariaLabel: "Disminuir stock",
            onClick: () => void handleQuickDelta(-1),
            disabled: busy || storage.quantity <= 0,
            "data-test-id": `storage-decrease-${storage.storageId}`,
          },
          {
            id: "increase",
            icon: "Plus",
            ariaLabel: "Aumentar stock",
            onClick: () => void handleQuickDelta(1),
            disabled: busy,
            "data-test-id": `storage-increase-${storage.storageId}`,
          },
          {
            id: "transfer",
            icon: "ArrowLeftRight",
            ariaLabel: "Transferir stock",
            onClick: () => {
              setError("");
              setTransferOpen(true);
            },
            disabled: busy || storageOptions.length === 0,
            "data-test-id": `storage-transfer-${storage.storageId}`,
          },
        ]}
      />

      <Dialog
        open={adjustOpen}
        onClose={() => !busy && setAdjustOpen(false)}
        title="Reconteo"
        alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setAdjustOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleRecount()} loading={busy}>
              Guardar
            </Button>
          </>
        }
      >
        <TextField
          label="Cantidad contada"
          placeholder="Cantidad contada"
          value={targetQty}
          onChange={(e) => setTargetQty(e.target.value)}
          inputMode="decimal"
        />
      </Dialog>

      <Dialog
        open={transferOpen}
        onClose={() => !busy && setTransferOpen(false)}
        title="Transferir stock"
        alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setTransferOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleTransfer()} loading={busy}>
              Transferir
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Almacén destino"
            placeholder="Almacén destino"
            value={targetStorageId}
            onChange={(id) => setTargetStorageId(id != null ? String(id) : "")}
            options={storageOptions}
          />
          <TextField
            label="Cantidad"
            placeholder="Cantidad"
            value={transferQty}
            onChange={(e) => setTransferQty(e.target.value)}
            inputMode="decimal"
          />
        </div>
      </Dialog>
    </>
  );
}
