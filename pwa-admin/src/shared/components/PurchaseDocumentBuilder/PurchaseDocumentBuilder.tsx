"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@/shared/components/IconButton/IconButton";
import { TextField } from "@/shared/components/TextField/TextField";
import NumberStepper from "@/shared/components/NumberStepper/NumberStepper";
import { Select, type Option } from "@/shared/components/Select";
import AutoComplete from "@/shared/components/AutoComplete/AutoComplete";
import Switch from "@/shared/components/Switch/Switch";
import { Button } from "@/shared/components/Button";
import type { PurchasingVariantSearchItem, PurchasingVariantSearchResult } from "@/features/purchasing-document/types/purchasing-document.types";
import type { SupplierGridRow } from "@/features/purchasing-suppliers/types/supplier.types";
import type { StorageListItem } from "@/features/inventory-storages/types/storage.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type {
  CreatePurchaseOrderInput,
  CreatePurchaseOrderResult,
} from "@/features/purchasing-document/types/purchase-order.types";
import type {
  CreateDirectReceptionInput,
  CreateReceptionResult,
  ReceptionDteType,
} from "@/features/receptions/types/reception.types";
import { formatMoney, InlineSepDot, ProductNameWithAttributes } from "./PurchaseDocumentProductPreview";
import { PurchaseDocumentVariantSearchPanel } from "./PurchaseDocumentVariantSearchPanel";
import { usePurchaseDocumentReferenceData } from "./usePurchaseDocumentReferenceData";

export type PurchaseDocumentMode = "reception" | "purchase_order";

export type PurchaseDocumentLine = {
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  /** Valores de atributos de la variante (solo valores, sin nombre de atributo en UI). */
  attributeValues: Record<string, string>;
  quantity: number;
  unitPrice: number;
  taxIds: string[];
};

export type PurchaseDocumentBuilderProps = {
  mode: PurchaseDocumentMode;
  variantSearch: PurchasingVariantSearchResult;
  searchQuery: string;
  searchPage: number;
  /** Modo orden de compra: crea transacción `PURCHASE_ORDER` en el API. */
  onSavePurchaseOrder?: (input: CreatePurchaseOrderInput) => Promise<CreatePurchaseOrderResult>;
  /** Modo recepción: `POST /receptions/direct` con DTE en metadata de la transacción de ingreso. */
  onSaveReception?: (input: CreateDirectReceptionInput) => Promise<CreateReceptionResult>;
};

function supplierLabel(s: SupplierGridRow): string {
  const a = s.alias?.trim();
  if (a) {
    return a;
  }
  const p = s.person;
  if (!p) {
    return s.id;
  }
  if (p.type === "COMPANY" && p.businessName?.trim()) {
    return p.businessName.trim();
  }
  const parts = [p.firstName, p.lastName].filter(Boolean);
  const joined = parts.join(" ").trim();
  return joined || s.id;
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PurchaseDocumentBuilder({
  mode,
  variantSearch,
  searchQuery,
  searchPage,
  onSavePurchaseOrder,
  onSaveReception,
}: PurchaseDocumentBuilderProps) {
  const router = useRouter();
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : [];
  const storages = reference.status === "ready" ? reference.storages : [];
  const taxes = reference.status === "ready" ? reference.taxes : [];
  const branchId = reference.status === "ready" ? reference.branchId : "";
  const referenceLoading = reference.status === "loading";
  const referenceError = reference.status === "error" ? reference.message : null;
  const referenceFieldsLocked = referenceLoading || referenceError != null;

  /**
   * En documentos de compra (OC / recepción) no se deben listar impuestos de tipo RETENTION
   * en las líneas (aplican a otros flujos como honorarios/retenciones).
   */
  const activeTaxes = useMemo(
    () => taxes.filter((t) => t.isActive !== false && t.taxType !== "RETENTION"),
    [taxes],
  );
  const activeTaxIdSet = useMemo(() => new Set(activeTaxes.map((t) => t.id)), [activeTaxes]);
  const activeStorages = useMemo(() => storages.filter((s) => s.isActive !== false), [storages]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.isActive !== false), [suppliers]);

  const supplierOptions: Option[] = useMemo(
    () => activeSuppliers.map((s) => ({ id: s.id, label: supplierLabel(s) })),
    [activeSuppliers],
  );
  const storageOptions: Option[] = useMemo(
    () => activeStorages.map((s) => ({ id: s.id, label: s.name })),
    [activeStorages],
  );

  const dteTypeOptions: Option[] = useMemo(
    () => [
      { id: "invoice", label: "Factura" },
      { id: "receipt", label: "Boleta" },
      { id: "guide", label: "Guía de despacho" },
      { id: "other", label: "Otro" },
    ],
    [],
  );

  const [lines, setLines] = useState<PurchaseDocumentLine[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [docDate, setDocDate] = useState(todayIsoDate);
  const [dteType, setDteType] = useState<string>("invoice");
  const [dteNumber, setDteNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedSupplierOption = useMemo(() => {
    if (supplierId == null || supplierId === "") {
      return null;
    }
    return supplierOptions.find((o) => String(o.id) === String(supplierId)) ?? null;
  }, [supplierId, supplierOptions]);

  const addVariant = useCallback((item: PurchasingVariantSearchItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.variantId === item.id ? { ...l, quantity: Math.max(1, l.quantity + 1) } : l,
        );
      }
      const price = Math.max(0, Math.round(item.pmp || 0));
      const row: PurchaseDocumentLine = {
        key: `${item.id}-${Date.now()}`,
        productId: item.productId,
        variantId: item.id,
        productName: item.productName,
        sku: item.sku,
        barcode: item.barcode,
        attributeValues: { ...item.attributeValues },
        quantity: 1,
        unitPrice: price,
        taxIds: (item.defaultTaxIds ?? []).filter((id) => activeTaxIdSet.has(id)),
      };
      return [...prev, row];
    });
  }, [activeTaxIdSet]);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<Pick<PurchaseDocumentLine, "quantity" | "unitPrice" | "taxIds">>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const toggleLineTax = useCallback((lineKey: string, taxId: string, checked: boolean) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== lineKey) {
          return l;
        }
        const set = new Set(l.taxIds);
        if (checked) {
          set.add(taxId);
        } else {
          set.delete(taxId);
        }
        return { ...l, taxIds: [...set] };
      }),
    );
  }, []);

  const summary = useMemo(() => {
    const taxById = new Map(activeTaxes.map((t) => [t.id, t]));
    let subtotalNeto = 0;
    let impuestosTotal = 0;

    for (const line of lines) {
      const lineNet = line.quantity * line.unitPrice;
      subtotalNeto += lineNet;
      let rateSumPct = 0;
      for (const tid of line.taxIds) {
        const t = taxById.get(tid);
        if (t) {
          rateSumPct += Number(t.rate) || 0;
        }
      }
      impuestosTotal += Math.round((lineNet * rateSumPct) / 100);
    }

    const total = subtotalNeto + impuestosTotal;
    return { subtotalNeto, impuestosTotal, total };
  }, [lines, activeTaxes]);

  const modeTitle = mode === "reception" ? "Recepción de compra" : "Orden de compra";

  const canSavePurchaseOrderBase =
    mode === "purchase_order" && Boolean(onSavePurchaseOrder) && Boolean(branchId?.trim());
  /** Orden confirmada: proveedor + al menos una línea. */
  const canConfirmPurchaseOrder =
    canSavePurchaseOrderBase && Boolean(supplierId?.trim()) && lines.length > 0;

  const canSaveReceptionBase =
    mode === "reception" && Boolean(onSaveReception) && Boolean(branchId?.trim());
  const canConfirmReception =
    canSaveReceptionBase &&
    Boolean(supplierId?.trim()) &&
    Boolean(storageId?.trim()) &&
    lines.length > 0 &&
    (dteType === "invoice" || dteType === "receipt" || dteType === "guide" || dteType === "other");

  const submitPurchaseOrder = useCallback(
    async (saveAsDraft: boolean) => {
      setSaveError(null);
      if (mode !== "purchase_order") {
        setSaveError("El guardado aún no está disponible para recepciones.");
        return;
      }
      if (!onSavePurchaseOrder) {
        setSaveError("No hay servicio de guardado configurado.");
        return;
      }
      if (!branchId?.trim()) {
        setSaveError("No hay sucursal configurada. Revise la empresa o cree una sucursal.");
        return;
      }
      if (!saveAsDraft) {
        if (!supplierId?.trim()) {
          setSaveError("Seleccione un proveedor.");
          return;
        }
        if (lines.length === 0) {
          setSaveError("Agregue al menos una línea de producto.");
          return;
        }
      }

      const storageTrim = storageId?.trim();
      const input: CreatePurchaseOrderInput = {
        branchId: branchId.trim(),
        ...(supplierId?.trim() ? { supplierId: supplierId.trim() } : {}),
        ...(storageTrim ? { storageId: storageTrim } : {}),
        documentDate: docDate,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          sku: l.sku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxIds: l.taxIds,
        })),
        ...(saveAsDraft ? { saveAsDraft: true } : {}),
      };

      setIsSaving(true);
      try {
        const result = await onSavePurchaseOrder(input);
        if (result.success) {
          router.push("/purchasing/transactions/orders");
        } else {
          setSaveError(result.error);
        }
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Error al guardar.");
      } finally {
        setIsSaving(false);
      }
    },
    [mode, onSavePurchaseOrder, branchId, supplierId, storageId, docDate, lines, router],
  );

  const submitReception = useCallback(async () => {
    setSaveError(null);
    if (mode !== "reception") {
      return;
    }
    if (!onSaveReception) {
      setSaveError("No hay servicio de guardado configurado.");
      return;
    }
    if (!branchId?.trim()) {
      setSaveError("No hay sucursal configurada.");
      return;
    }
    if (!storageId?.trim()) {
      setSaveError("Seleccione almacén destino.");
      return;
    }
    if (!supplierId?.trim()) {
      setSaveError("Seleccione un proveedor.");
      return;
    }
    if (lines.length === 0) {
      setSaveError("Agregue al menos una línea de producto.");
      return;
    }
    if (dteType !== "invoice" && dteType !== "receipt" && dteType !== "guide" && dteType !== "other") {
      setSaveError("Seleccione tipo de DTE.");
      return;
    }

    const input: CreateDirectReceptionInput = {
      branchId: branchId.trim(),
      storageId: storageId.trim(),
      supplierId: supplierId.trim(),
      dteNumber: dteNumber.trim() || null,
      dteType: dteType as ReceptionDteType,
      notes: null,
      lines: lines.map((l) => ({
        productId: l.productId,
        productVariantId: l.variantId,
        productName: l.productName,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        receivedQuantity: l.quantity,
      })),
    };

    setIsSaving(true);
    try {
      const result = await onSaveReception(input);
      if (result.success) {
        router.push("/purchasing/transactions/receptions");
      } else {
        setSaveError(result.error);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }, [mode, onSaveReception, branchId, storageId, supplierId, lines, dteNumber, dteType, router]);

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch"
      data-test-id="purchase-document-builder"
    >
      <PurchaseDocumentVariantSearchPanel
        variantSearch={variantSearch}
        searchQuery={searchQuery}
        searchPage={searchPage}
        onAddVariant={addVariant}
      />

      <section
        className="flex h-[80vh] min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-3"
        data-test-id="purchase-document-detail-panel"
      >
        <div className="flex w-full min-w-0 flex-col gap-3" data-test-id="purchase-doc-header-fields">
          {referenceError ? (
            <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
              {referenceError}
            </p>
          ) : null}
          <div className="flex w-full min-w-0 items-start justify-between gap-4">
            <h2
              className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground"
              data-test-id="purchase-doc-title"
            >
              {modeTitle}
            </h2>
            <div className="min-w-0 w-[min(100%,18rem)] shrink-0 sm:w-[min(100%,20rem)]">
              <AutoComplete
                label="Proveedor"
                name="purchase-doc-supplier"
                placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
                options={supplierOptions}
                value={selectedSupplierOption}
                onChange={(opt) => setSupplierId(opt ? String(opt.id) : null)}
                alwaysShowLabel
                disabled={referenceFieldsLocked}
                data-test-id="purchase-doc-supplier"
              />
            </div>
          </div>
          <div
            className={`grid w-full min-w-0 grid-cols-1 items-start gap-x-4 gap-y-3 lg:grid-rows-1 ${
              mode === "reception" ? "sm:grid-cols-2 lg:grid-cols-4" : "max-w-xs"
            }`}
          >
            <div className="min-w-0 w-full self-stretch">
              <TextField
                label="Fecha"
                name="purchase-doc-date"
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full min-w-0"
                data-test-id="purchase-doc-date"
              />
            </div>
            {mode === "reception" ? (
              <>
                <div className="min-w-0 w-full self-stretch">
                  <Select
                    label="Almacén destino"
                    name="purchase-doc-storage"
                    placeholder={referenceLoading ? "Cargando…" : "Seleccionar"}
                    options={storageOptions}
                    value={storageId}
                    onChange={(id) => setStorageId(id == null ? null : String(id))}
                    allowClear
                    alwaysShowLabel
                    disabled={referenceFieldsLocked}
                    className="w-full min-w-0"
                    data-test-id="purchase-doc-storage"
                  />
                </div>
                <div className="min-w-0 w-full self-stretch">
                  <Select
                    label="Tipo de DTE"
                    name="purchase-doc-dte-type"
                    placeholder="Seleccionar"
                    options={dteTypeOptions}
                    value={dteType}
                    onChange={(id) => setDteType(id == null ? "invoice" : String(id))}
                    alwaysShowLabel
                    className="w-full min-w-0"
                    data-test-id="purchase-doc-dte-type"
                  />
                </div>
                <div className="min-w-0 w-full self-stretch">
                  <TextField
                    label="Folio DTE"
                    name="purchase-doc-dte-number"
                    value={dteNumber}
                    onChange={(e) => setDteNumber(e.target.value)}
                    placeholder="Número del documento tributario"
                    alwaysShowLabel
                    className="w-full min-w-0"
                    data-test-id="purchase-doc-dte-number"
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto">
          <table
            className="w-full min-w-[760px] table-fixed border-collapse text-sm"
            data-test-id="purchase-doc-lines-table"
          >
            <colgroup>
              <col className="min-w-0" />
              <col className="w-36" />
              <col className="w-40" />
              <col className="min-w-[12rem] w-[12rem]" />
              <col className="w-36" />
              <col className="w-12" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2">Producto</th>
                <th className="py-2 pr-2">Cantidad</th>
                <th className="py-2 pr-2">Precio de compra neto</th>
                <th className="py-2 pr-2">Impuestos</th>
                <th className="py-2 pr-2 text-right">Subtotal</th>
                <th className="w-12 py-2 text-center"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10">
                    <span className="sr-only">Sin líneas en el documento</span>
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.key} className="border-b border-border/70 align-top" data-test-id={`purchase-doc-line-${line.key}`}>
                    <td className="py-2 pr-2">
                      <ProductNameWithAttributes
                        name={line.productName}
                        attributeValues={line.attributeValues}
                        className="font-medium text-foreground"
                      />
                      <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-xs text-muted-foreground">
                        <span>{line.sku}</span>
                        {line.barcode ? (
                          <>
                            <InlineSepDot />
                            <span>{line.barcode}</span>
                          </>
                        ) : null}
                      </p>
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <NumberStepper
                        value={line.quantity}
                        onChange={(v) =>
                          updateLine(line.key, { quantity: Math.max(1, Math.round(Number(v))) })
                        }
                        min={1}
                        step={1}
                        allowNegative={false}
                        data-test-id={`purchase-doc-qty-${line.key}`}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <TextField
                        label=""
                        name={`price-${line.key}`}
                        type="currency"
                        currencySymbol="$"
                        startSymbol="$"
                        value={String(line.unitPrice)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.round(Number(e.target.value) || 0));
                          updateLine(line.key, { unitPrice: n });
                        }}
                        density="compact"
                        className="w-full min-w-0"
                        data-test-id={`purchase-doc-price-${line.key}`}
                      />
                    </td>
                    <td className="py-2 pr-2 align-middle">
                      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1">
                        {referenceLoading ? (
                          <span className="text-xs text-muted-foreground">Cargando impuestos…</span>
                        ) : activeTaxes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sin impuestos definidos</span>
                        ) : (
                          activeTaxes.map((tax) => (
                            <Switch
                              key={tax.id}
                              checked={line.taxIds.includes(tax.id)}
                              onChange={(checked) => toggleLineTax(line.key, tax.id, checked)}
                              label={`${tax.name} (${tax.rate}%)`}
                              labelPosition="right"
                              data-test-id={`purchase-doc-tax-${line.key}-${tax.id}`}
                            />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2 align-middle text-right tabular-nums font-medium text-foreground">
                      {formatMoney(line.quantity * line.unitPrice)}
                    </td>
                    <td className="py-2 align-middle text-center">
                      <IconButton
                        icon="Trash2"
                        variant="basicSecondary"
                        size="sm"
                        title="Quitar línea"
                        ariaLabel="Quitar línea"
                        onClick={() => removeLine(line.key)}
                        data-test-id={`purchase-doc-remove-${line.key}`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto flex w-full min-w-0 shrink-0 flex-col gap-0">
          <footer
            className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm"
            data-test-id="purchase-doc-summary"
          >
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal neto</span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-subtotal-net">
                {formatMoney(summary.subtotalNeto)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Impuestos</span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-taxes">
                {formatMoney(summary.impuestosTotal)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <span className="font-medium text-foreground">Total</span>
              <span className="tabular-nums font-semibold text-foreground" data-test-id="purchase-doc-summary-total">
                {formatMoney(summary.total)}
              </span>
            </div>
          </footer>
          <div className="flex w-full flex-col items-stretch gap-2 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {saveError ? (
              <p
                className="max-w-full flex-1 text-right text-sm text-error sm:min-w-0 sm:flex-none sm:w-full sm:order-last"
                role="alert"
                data-test-id="purchase-doc-save-error"
              >
                {saveError}
              </p>
            ) : null}
            {(mode === "purchase_order" && onSavePurchaseOrder) || (mode === "reception" && onSaveReception) ? (
              <>
                <Button
                  variant="outlinedSecondary"
                  size="md"
                  type="button"
                  disabled={isSaving || mode !== "purchase_order" || !canSavePurchaseOrderBase}
                  onClick={() => {
                    if (mode === "purchase_order") {
                      void submitPurchaseOrder(true);
                    }
                  }}
                  data-test-id="purchase-doc-save-draft"
                  title={
                    mode === "reception"
                      ? "El borrador solo está disponible en orden de compra."
                      : !canSavePurchaseOrderBase
                        ? "Configure sucursal para guardar borrador."
                        : undefined
                  }
                >
                  {isSaving ? "Guardando…" : "Borrador"}
                </Button>
                <Button
                  variant="outlined"
                  size="md"
                  type="button"
                  disabled={
                    isSaving ||
                    (mode === "purchase_order" ? !canConfirmPurchaseOrder : !canConfirmReception)
                  }
                  onClick={() => {
                    if (mode === "purchase_order") {
                      void submitPurchaseOrder(false);
                    } else {
                      void submitReception();
                    }
                  }}
                  data-test-id="purchase-doc-save"
                  title={
                    mode === "purchase_order"
                      ? !canConfirmPurchaseOrder
                        ? "Orden confirmada: seleccione proveedor, líneas y sucursal."
                        : undefined
                      : !canConfirmReception
                        ? "Recepción: sucursal, proveedor, almacén, tipo de DTE y al menos una línea."
                        : undefined
                  }
                >
                  {isSaving ? "Guardando…" : "Guardar"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
