"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import Switch from "@/shared/components/Switch/Switch";
import type { StorageCategory, StorageType } from "@/features/inventory-storages/types/storage.types";
import { createStorageAction } from "@/features/inventory-storages/actions/storage.action";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";
import { STORAGE_CATEGORY_SELECT_OPTIONS, STORAGE_TYPE_SELECT_OPTIONS } from "./storageFormOptions";

export type CreateStorageDialogProps = {
  open: boolean;
  onClose: () => void;
  branches: BranchListItem[];
  onSuccess?: () => void | Promise<void>;
};

export function CreateStorageDialog({ open, onClose, branches, onSuccess }: CreateStorageDialogProps) {
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState<StorageType>("WAREHOUSE");
  const [category, setCategory] = useState<StorageCategory>("IN_BRANCH");
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
    setName("");
    setBranchId("");
    setType("WAREHOUSE");
    setCategory("IN_BRANCH");
    setLocation("");
    setIsDefault(false);
    setIsActive(true);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (category === "IN_BRANCH") {
      setLocation("");
    }
  }, [category]);

  const handleClose = () => {
    setName("");
    setBranchId("");
    setType("WAREHOUSE");
    setCategory("IN_BRANCH");
    setLocation("");
    setIsDefault(false);
    setIsActive(true);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(() => {
      void (async () => {
        const r = await createStorageAction({
          name: name.trim(),
          branchId: branchId === "" ? null : branchId,
          type,
          category,
          capacity: "",
          location:
            category === "IN_BRANCH" ? undefined : location.trim() || undefined,
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
      title="Crear almacén"
      size="md"
      scroll="paper"
      maxHeight="min(90vh, 800px)"
      data-test-id="storage-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="storage-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending} data-test-id="storage-create-cancel">
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit} data-test-id="storage-create-submit">
            Crear
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <TextField
          label="Nombre"
          name="storage-create-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          required
          data-test-id="storage-create-name"
        />
        <Select
          label="Sucursal"
          name="storage-create-branch"
          value={branchId || null}
          onChange={(id) => setBranchId(id == null ? "" : String(id))}
          options={branchOptions}
          placeholder="Sin sucursal"
          data-test-id="storage-create-branch"
        />
        <Select
          label="Tipo"
          name="storage-create-type"
          value={type}
          onChange={(id) => setType(String(id) as StorageType)}
          options={STORAGE_TYPE_SELECT_OPTIONS}
          required
          data-test-id="storage-create-type"
        />
        <Select
          label="Categoría"
          name="storage-create-category"
          value={category}
          onChange={(id) => setCategory(String(id) as StorageCategory)}
          options={STORAGE_CATEGORY_SELECT_OPTIONS}
          required
          data-test-id="storage-create-category"
        />
        {category !== "IN_BRANCH" ? (
          <TextField
            label="Ubicación"
            name="storage-create-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ubicación"
            rows={2}
            data-test-id="storage-create-location"
          />
        ) : null}
        <div className="pt-1">
          <Switch
            checked={isDefault}
            onChange={setIsDefault}
            label="Almacén predeterminado"
            labelPosition="right"
            data-test-id="storage-create-default"
          />
        </div>
        <div className="pt-1">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Activo en catálogo"
            labelPosition="right"
            data-test-id="storage-create-active"
          />
        </div>
      </div>
    </Dialog>
  );
}
