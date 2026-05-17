"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { Alert, Button, Dialog, IconButton, Select, TextField } from "@/shared";
import type { Option as SelectOption } from "@/shared/Select/Select";
import type { StockStorageBreakdown, StorageOption } from "../types/stock.types";
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
      setError(r.error);
      return;
    }
    setTransferOpen(false);
    onUpdated();
  };

  return (
    <article
      className="rounded-lg border border-border p-4"
      data-test-id={`storage-card-${storage.storageId}`}
    >
      <div className="mb-3">
        <h3 className="font-semibold">{storage.storageName}</h3>
        {storage.branchName ? (
          <p className="text-xs text-muted-foreground">{storage.branchName}</p>
        ) : null}
        <p className="mt-2 text-2xl font-bold tabular-nums">{storage.quantity}</p>
        <p className="text-xs text-muted-foreground">
          Disponible: {storage.availableStock}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setTargetQty(String(storage.quantity));
            setError("");
            setAdjustOpen(true);
          }}
        >
          <Scale size={16} className="mr-1 inline" />
          Reconteo
        </Button>
        <IconButton
          variant="basicSecondary"
          size="sm"
          ariaLabel="Disminuir stock"
          icon="Minus"
          onClick={() => void handleQuickDelta(-1)}
          disabled={busy || storage.quantity <= 0}
        />
        <IconButton
          variant="basicSecondary"
          size="sm"
          ariaLabel="Aumentar stock"
          icon="Plus"
          onClick={() => void handleQuickDelta(1)}
          disabled={busy}
        />
        <IconButton
          variant="basicSecondary"
          size="sm"
          ariaLabel="Transferir"
          icon="ArrowLeftRight"
          onClick={() => {
            setError("");
            setTransferOpen(true);
          }}
          disabled={busy || storageOptions.length === 0}
        />
      </div>

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
    </article>
  );
}

