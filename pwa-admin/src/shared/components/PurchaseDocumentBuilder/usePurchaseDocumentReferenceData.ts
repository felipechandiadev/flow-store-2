"use client";

import { useEffect, useState } from "react";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { loadCompanyBankAccountsForPurchasingAction } from "@/features/purchasing-invoices/actions/company-banks.action";
import { listSuppliersForGrid } from "@/features/purchasing-suppliers/actions/supplier.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { BranchListItem } from "@/features/settings-branches/types/branch.types";

function pickDefaultBranchId(branches: BranchListItem[]): string {
  if (!branches.length) {
    return "";
  }
  const hq = branches.find((b) => b.isHeadquarters && b.isActive !== false);
  if (hq) {
    return hq.id;
  }
  const active = branches.find((b) => b.isActive !== false);
  if (active) {
    return active.id;
  }
  return branches[0]?.id ?? "";
}

export type PurchaseDocumentReferenceState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      suppliers: SupplierGridRow[];
      storages: StorageListItem[];
      taxes: TaxListItem[];
      branchId: string;
      companyBankAccounts: CompanyBankAccountItem[];
    };

/**
 * Catálogo de proveedores, almacenes, impuestos y primera sucursal (para asiento).
 * Fuera del RSC para no acoplar la página de compras al tiempo de esas APIs.
 */
export function usePurchaseDocumentReferenceData(): PurchaseDocumentReferenceState {
  const [state, setState] = useState<PurchaseDocumentReferenceState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [suppliersResult, storages, taxes, branches, companyBankAccounts] = await Promise.all([
          listSuppliersForGrid(),
          listStoragesForPage(),
          listTaxesForPage(),
          listBranchesForSettingsPage(),
          loadCompanyBankAccountsForPurchasingAction(),
        ]);
        if (cancelled) {
          return;
        }
        setState({
          status: "ready",
          suppliers: suppliersResult.rows,
          storages,
          taxes,
          branchId: pickDefaultBranchId(branches),
          companyBankAccounts,
        });
      } catch (e) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "No se pudieron cargar proveedores, almacenes o impuestos.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
