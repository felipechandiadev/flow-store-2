"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import Switch from "@/shared/components/Switch/Switch";
import type { StorageCategory, StorageListItem, StorageType } from "@/features/inventory-storages/types/storage.types";
import { updateStorageAction } from "@/features/inventory-storages/actions/storage.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { STORAGE_CATEGORY_SELECT_OPTIONS, STORAGE_TYPE_SELECT_OPTIONS } from "./storageFormOptions";

export type UpdateStorageDialogProps = {
  open: boolean;
  onClose: () => void;
  storage: StorageListItem;
  branches: BranchListItem[];
  onSuccess?: () => void | Promise<void>;
};

export function UpdateStorageDialog({
  open,
  onClose,
  storage,
  branches,
  onSuccess,
}: UpdateStorageDialogProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState<StorageType>("WAREHOUSE");
  const [category, setCategory] = useState<StorageCategory>("IN_BRANCH");
  const [capacityStr, setCapacityStr] = useState("");
  const [location, setLocation] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const branchOptions = useMemo(() => {
    const sorted = [...branches].sort((a, b) => a.name.localeCompare(b.name, "es"));
    return [{ id: "", label: "Sin sucursal" }, ...sorted.map((b) => ({ id: b.id, label: b.name }))];
  }, [branches]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(storage.name);
    setCode(storage.code ?? "");
    setBranchId(storage.branchId ?? "");
    setType(storage.type);
    setCategory(storage.category);
    setCapacityStr(storage.capacity != null ? String(storage.capacity) : "");
    setLocation(storage.location ?? "");
    setIsDefault(storage.isDefault);
    setIsActive(storage.isActive);
    setError(null);
  }, [open, storage]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await updateStorageAction({
          id: storage.id,
          name: name.trim(),
          code: code.trim(),
          branchId: branchId === "" ? null : branchId,
          type,
          category,
          capacity: capacityStr,
          location: category === "IN_BRANCH" ? null : location.trim(),
          isDefault,
          isActive,
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

  const canSubmit = name.trim() && !isPending;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Actualizar almacén"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="storage-update-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="storage-update-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="storage-update-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="storage-update-submit">
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="storage-update-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="storage-update-name"
        />
        <TextField
          label="Código"
          name="storage-update-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código"
          data-test-id="storage-update-code"
        />
        <Select
          label="Sucursal"
          name="storage-update-branch"
          value={branchId || null}
          onChange={(id) => setBranchId(id == null ? "" : String(id))}
          options={branchOptions}
          placeholder="Sin sucursal"
          data-test-id="storage-update-branch"
        />
        <Select
          label="Tipo"
          name="storage-update-type"
          value={type}
          onChange={(id) => setType(String(id) as StorageType)}
          options={STORAGE_TYPE_SELECT_OPTIONS}
          required
          data-test-id="storage-update-type"
        />
        <Select
          label="Categoría"
          name="storage-update-category"
          value={category}
          onChange={(id) => {
            const next = String(id) as StorageCategory;
            if (next === "IN_BRANCH") {
              setLocation("");
            }
            setCategory(next);
          }}
          options={STORAGE_CATEGORY_SELECT_OPTIONS}
          required
          data-test-id="storage-update-category"
        />
        <TextField
          label="Capacidad"
          name="storage-update-capacity"
          value={capacityStr}
          onChange={(e) => setCapacityStr(e.target.value)}
          placeholder="Capacidad"
          data-test-id="storage-update-capacity"
        />
        {category !== "IN_BRANCH" ? (
          <TextField
            label="Ubicación"
            name="storage-update-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ubicación"
            rows={2}
            data-test-id="storage-update-location"
          />
        ) : null}
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Almacén predeterminado"
            labelPosition="right"
            data-test-id="storage-update-default"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="storage-update-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
