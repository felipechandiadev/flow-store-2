"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import Switch from "@/shared/components/Switch/Switch";
import type { PointOfSaleListItem } from "@/features/sales-points-of-sale/types/point-of-sale.types";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import type { PriceListListItem } from "@/features/sales-price-lists/types/price-list.types";
import { updatePointOfSaleAction } from "@/features/sales-points-of-sale/actions/point-of-sale.action";

export type UpdatePointOfSaleDialogProps = {
  open: boolean;
  onClose: () => void;
  point: PointOfSaleListItem;
  onSuccess?: () => void | Promise<void>;
  branches: BranchListItem[];
  priceListCatalog: PriceListListItem[];
};

export function UpdatePointOfSaleDialog({
  open,
  onClose,
  point,
  onSuccess,
  branches,
  priceListCatalog,
}: UpdatePointOfSaleDialogProps) {
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [deviceId, setDeviceId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [defaultListId, setDefaultListId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const branchOptions = useMemo(
    () => branches.map((b) => ({ id: b.id, label: b.name })),
    [branches],
  );

  const hasBranches = branchOptions.length > 0;

  const defaultListOptions = useMemo(() => {
    return selectedListIds
      .map((id) => priceListCatalog.find((p) => p.id === id))
      .filter((p): p is PriceListListItem => Boolean(p))
      .map((p) => ({ id: p.id, label: p.name + (p.isActive ? "" : " (inactiva)") }));
  }, [selectedListIds, priceListCatalog]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(point.name);
    const resolvedBranchId =
      point.branchId && branches.some((b) => b.id === point.branchId)
        ? point.branchId
        : branches[0]?.id ?? "";
    setBranchId(resolvedBranchId);
    setDeviceId(
      point.deviceId != null && String(point.deviceId).trim() ? String(point.deviceId) : "",
    );
    setIsActive(point.isActive);
    setSelectedListIds(
      (point.priceLists && point.priceLists.length > 0
        ? point.priceLists.map((p) => p.id)
        : []),
    );
    setDefaultListId(
      point.defaultPriceListId && point.priceLists?.some((p) => p.id === point.defaultPriceListId)
        ? point.defaultPriceListId
        : null,
    );
    setError(null);
  }, [open, point, branches]);

  useEffect(() => {
    if (selectedListIds.length === 0) {
      setDefaultListId(null);
      return;
    }
    setDefaultListId((prev) => {
      if (prev != null && selectedListIds.includes(prev)) {
        return prev;
      }
      return selectedListIds[0] ?? null;
    });
  }, [selectedListIds]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const toggleList = (id: string) => {
    setSelectedListIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onDefaultListChange = (v: string | number | null) => {
    if (v == null) {
      return;
    }
    setDefaultListId(String(v));
  };

  const handleSubmit = () => {
    setError(null);
    const priceLists = selectedListIds
      .map((id) => priceListCatalog.find((p) => p.id === id))
      .filter((p): p is PriceListListItem => Boolean(p))
      .map((p) => ({ id: p.id, name: p.name, isActive: p.isActive }));

    startTransition(() => {
      void (async () => {
        const r = await updatePointOfSaleAction({
          id: point.id,
          name: name.trim(),
          branchId,
          deviceId,
          isActive,
          priceLists,
          defaultPriceListId: defaultListId,
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar punto de venta"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 640px)"
      data-test-id="pos-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="pos-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button
            variant="outlined"
            size="md"
            onClick={handleClose}
            disabled={isPending}
            data-test-id="pos-update-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending || !branchId || !hasBranches}
            data-test-id="pos-update-submit"
          >
            Actualizar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="pos-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="pos-update-name"
        />
        {hasBranches ? (
          <Select
            label="Sucursal"
            name="pos-update-branch"
            value={branchId}
            onChange={(id) => {
              if (id != null && id !== "") {
                setBranchId(String(id));
              }
            }}
            options={branchOptions}
            placeholder="Sucursal"
            required
            data-test-id="pos-update-branch"
          />
        ) : (
          <p className="text-sm text-muted-foreground" data-test-id="pos-update-branch-hint">
            No hay sucursales disponibles. Crea al menos una en Ajustes → Sucursales.
          </p>
        )}
        <TextField
          label="ID de dispositivo (opcional)"
          name="pos-update-device"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="ID de dispositivo"
          data-test-id="pos-update-device"
        />
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Punto de venta activo"
            labelPosition="right"
            data-test-id="pos-update-active"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Listas de precio</p>
          <p className="text-xs text-muted-foreground">Marca las listas asociadas a este punto de venta.</p>
          {priceListCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay listas de precio en el catálogo.</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {priceListCatalog.map((pl) => (
                <li key={pl.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`pos-update-pl-${pl.id}`}
                    className="h-4 w-4 shrink-0 rounded border-border"
                    checked={selectedListIds.includes(pl.id)}
                    onChange={() => toggleList(pl.id)}
                    data-test-id={`pos-update-pl-${pl.id}`}
                  />
                  <label htmlFor={`pos-update-pl-${pl.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                    {pl.name}
                    {!pl.isActive && (
                      <span className="ml-1 text-xs text-muted-foreground">(inactiva)</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedListIds.length > 1 && (
          <Select
            label="Lista de precio preferente en este POS"
            name="pos-update-default-list"
            value={defaultListId ?? defaultListOptions[0]?.id}
            onChange={onDefaultListChange}
            options={defaultListOptions}
            required
            placeholder="Elegir lista"
            data-test-id="pos-update-default-list"
          />
        )}
      </div>
    </Dialog>
  );
}
