"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch/Switch";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import {
  defaultCompanyEShopFlatSettings,
  type CompanyEShopFlatSettings,
} from "@/features/companies/types/company-eshop.types";
import {
  getCompanyEShopSettingsAction,
  replaceCompanyEShopSettingsAction,
} from "@/features/companies/actions/companies-eshop.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import { storageTypeLabel } from "@/features/inventory-storages/types/storage.types";

type Props = { company: CompanyDetails };

function buildStorageOptions(storages: StorageListItem[]) {
  return storages
    .filter((s) => s.isActive)
    .sort((a, b) => {
      const branchA = a.branch?.name ?? "";
      const branchB = b.branch?.name ?? "";
      if (branchA !== branchB) {
        return branchA.localeCompare(branchB, "es");
      }
      return a.name.localeCompare(b.name, "es");
    })
    .map((s) => ({
      id: s.id,
      label: s.branch
        ? `${s.branch.name} · ${s.name} (${storageTypeLabel(s.type)})`
        : `${s.name} (${storageTypeLabel(s.type)})`,
    }));
}

export function CompanyEShopSection({ company }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState<CompanyEShopFlatSettings>(
    defaultCompanyEShopFlatSettings(),
  );
  const [storages, setStorages] = useState<StorageListItem[]>([]);
  const [loadingStorages, setLoadingStorages] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!company.id) return;
    getCompanyEShopSettingsAction(company.id).then((r) => {
      if (r.success) setSettings(r.eShopSettings);
    });
  }, [company.id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingStorages(true);
    void listStoragesForPage()
      .then((rows) => {
        if (!cancelled) setStorages(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingStorages(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const storageOptions = useMemo(() => buildStorageOptions(storages), [storages]);

  return (
    <section className="space-y-4" data-test-id="company-eshop-settings">
      <h2 className="text-lg font-semibold">eShop</h2>
      <Switch
        label="Tienda en línea habilitada"
        checked={settings.eShopEnabled}
        onChange={(v) => setSettings((s) => ({ ...s, eShopEnabled: v }))}
      />
      <TextField
        label="Slug público (URL /e-shop/[slug])"
        value={settings.eShopPublicSlug ?? ""}
        onChange={(e) => setSettings((s) => ({ ...s, eShopPublicSlug: e.target.value || null }))}
      />
      <Select
        label="Almacén asociado al eShop"
        name="eShopDefaultStorageId"
        placeholder={loadingStorages ? "Cargando almacenes…" : "Seleccionar almacén"}
        options={[{ id: "", label: "— Sin selección —" }, ...storageOptions]}
        value={settings.eShopDefaultStorageId ?? ""}
        disabled={loadingStorages || busy}
        allowClear
        onChange={(id) => {
          const storageId = id ? String(id) : null;
          const storage = storages.find((s) => s.id === storageId);
          setSettings((s) => ({
            ...s,
            eShopDefaultStorageId: storageId,
            eShopDefaultBranchId: storage?.branchId ?? s.eShopDefaultBranchId,
          }));
        }}
        data-test-id="company-eshop-default-storage"
      />
      <p className="text-xs text-muted-foreground">
        Stock disponible y despachos de la tienda en línea se calculan desde este almacén.
      </p>
      <TextField
        label="Umbral envío gratis (CLP)"
        value={settings.eShopFreeShippingThreshold?.toString() ?? ""}
        onChange={(e) =>
          setSettings((s) => ({
            ...s,
            eShopFreeShippingThreshold: e.target.value ? Number(e.target.value) : null,
          }))
        }
      />
      <Button
        variant="primary"
        disabled={busy || !company.id}
        onClick={() => {
          if (!company.id) return;
          setBusy(true);
          replaceCompanyEShopSettingsAction(company.id, settings).finally(() => {
            setBusy(false);
            router.refresh();
          });
        }}
        data-test-id="company-eshop-save"
      >
        Guardar eShop
      </Button>
    </section>
  );
}
