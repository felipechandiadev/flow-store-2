"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { CreatePurchaseOrderLineInput } from "@/features/purchasing-document/types/purchase-order.types";
import type {
  CreateDirectReceptionInput,
  CreateReceptionResult,
  ReceptionDteType,
  ReceptionDetailForReturn,
  ReceptionFetchResult,
} from "@/features/receptions/types/reception.types";
import type {
  CreatePurchaseReturnInput,
  CreatePurchaseReturnResult,
} from "@/features/purchasing-purchase-returns/types/purchase-return.types";
import {
  formatReceptionPaymentSummary,
  type ReceptionSupplierDocumentPaymentPayload,
} from "@/features/receptions/types/reception-document-payment.types";
import { getCompanyDetailsAction } from "@/features/settings-company/actions/company.action";
import type { CompanyDetails, CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import { formatMoney, InlineSepDot, ProductNameWithAttributes } from "./PurchaseDocumentProductPreview";
import { PurchaseDocumentVariantSearchPanel } from "./PurchaseDocumentVariantSearchPanel";
import { usePurchaseDocumentReferenceData } from "./usePurchaseDocumentReferenceData";
import { usePrint } from "@/shared/components/PrintDialog/usePrint";
import { PrintDialog } from "@/shared/components/PrintDialog/PrintDialog";
import {
  PurchaseOrderPrintDocument,
  type PurchaseOrderPrintModel,
} from "@/shared/components/PrintDocuments/PurchaseOrderPrintDocument";
import type { SupplierPrintSummaryModel } from "@/shared/components/PrintDocuments/SupplierPrintSummaryBlock";
import { ReceptionPrintDocument } from "@/shared/components/PrintDocuments/ReceptionPrintDocument";
import { buildSupplierIdentityPrintFields } from "@/shared/components/PrintDocuments/supplierPrintIdentity";
import type { PrintableCompanyInfo } from "@/shared/components/PrintDocuments/PrintableDocumentLayout";
import type { CashHubRow } from "@/features/treasury-cash-hubs/types/cash-hub.types";
import { PurchaseDocumentReceptionPaymentDialog } from "./PurchaseDocumentReceptionPaymentDialog";
import Dialog from "@/shared/components/Dialog/Dialog";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PurchaseDocumentMode = "reception" | "purchase_order" | "purchase_return";

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
  /** Tope de cantidad a devolver (desde línea de recepción). */
  maxReturnQuantity?: number | null;
};

/** Referencias estables cuando `reference` aún no está listo (evita bucles de efectos en hijos). */
const EMPTY_SUPPLIER_LIST: SupplierGridRow[] = [];
const EMPTY_STORAGE_LIST: StorageListItem[] = [];
const EMPTY_TAX_LIST: TaxListItem[] = [];
const EMPTY_COMPANY_BANKS: CompanyBankAccountItem[] = [];
const EMPTY_CASH_HUB_LIST: CashHubRow[] = [];

export type PurchaseDocumentBuilderProps = {
  mode: PurchaseDocumentMode;
  variantSearch: PurchasingVariantSearchResult;
  searchQuery: string;
  searchPage: number;
  /** Si se define, muestra botón atrás hacia el listado (p. ej. recepciones u órdenes). */
  backToListHref?: string;
  /** Modo orden de compra: crea transacción `PURCHASE_ORDER` en el API. */
  onSavePurchaseOrder?: (input: CreatePurchaseOrderInput) => Promise<CreatePurchaseOrderResult>;
  /** Modo recepción: `POST /receptions/direct` con DTE en metadata de la transacción de ingreso. */
  onSaveReception?: (input: CreateDirectReceptionInput) => Promise<CreateReceptionResult>;
  /** Modo devolución: crea `PURCHASE_RETURN` (sin panel de búsqueda de variantes). */
  onSavePurchaseReturn?: (input: CreatePurchaseReturnInput) => Promise<CreatePurchaseReturnResult>;
  fetchReceptionDetail?: (receptionId: string) => Promise<ReceptionFetchResult>;
  resolveReceptionBySupplierDocument?: (
    supplierId: string,
    documentRef: string,
  ) => Promise<ReceptionFetchResult>;
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

function mapReceptionLinesToDocumentLines(recLines: ReceptionDetailForReturn["lines"]): PurchaseDocumentLine[] {
  const rows = recLines.filter((l) => (Number(l.receivedQuantity ?? l.quantity) || 0) > 0);
  return rows.map((l) => {
    const cap = Number(l.receivedQuantity ?? l.quantity) || 0;
    const sku = (l.sku?.trim() || "—") as string;
    const nameParts = [String(l.productName || "").trim(), (l.variantName ?? "").trim()].filter(Boolean);
    const productName = nameParts.join(" · ") || "Ítem";
    const pid = (l.productId ?? "").trim();
    const vid = (l.productVariantId ?? "").trim();
    const initialQty = Math.min(cap, Math.max(0.01, cap));
    return {
      key: `ret-line-${l.id}`,
      productId: pid,
      variantId: vid,
      productName,
      sku,
      barcode: null,
      attributeValues: {},
      quantity: initialQty,
      unitPrice: Math.max(0, Math.round(Number(l.unitPrice) || 0)),
      taxIds: [],
      maxReturnQuantity: cap > 0 ? cap : null,
    };
  });
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function printableCompanyFromDetails(details: CompanyDetails | null): PrintableCompanyInfo {
  const razonSocial = details?.razonSocial?.trim() || "Empresa";
  const displayName = details?.nombreFantasia?.trim() ? details.nombreFantasia.trim() : null;
  const rut = details?.rut?.trim() ? details.rut.trim() : null;
  const settings = (details?.settings ?? {}) as Record<string, unknown>;

  const columnAddress = details?.address?.trim() ? details.address.trim() : "";
  const addressRaw =
    columnAddress ||
    (typeof settings["address"] === "string" ? settings["address"].trim() : "") ||
    (typeof settings["direccion"] === "string" ? settings["direccion"].trim() : "") ||
    (typeof settings["companyAddress"] === "string" ? settings["companyAddress"].trim() : "");
  const cityRaw = settings["city"] ?? settings["ciudad"];
  const phoneRaw = settings["phone"] ?? settings["telefono"] ?? settings["companyPhone"];
  const columnMail = details?.mail?.trim() ? details.mail.trim() : "";
  const emailRaw =
    columnMail ||
    (typeof settings["email"] === "string" ? settings["email"].trim() : "") ||
    (typeof settings["correo"] === "string" ? settings["correo"].trim() : "") ||
    (typeof settings["companyEmail"] === "string" ? settings["companyEmail"].trim() : "");

  const address = typeof addressRaw === "string" ? addressRaw.trim() : "";
  const city = typeof cityRaw === "string" ? cityRaw.trim() : "";
  const phone = typeof phoneRaw === "string" ? phoneRaw.trim() : null;
  const email = typeof emailRaw === "string" ? emailRaw.trim() : null;

  const addressLines = [address, city].filter(Boolean);

  return {
    razonSocial,
    displayName,
    rut,
    addressLines,
    phone,
    email,
  };
}

export function PurchaseDocumentBuilder({
  mode,
  variantSearch,
  searchQuery,
  searchPage,
  backToListHref,
  onSavePurchaseOrder,
  onSaveReception,
  onSavePurchaseReturn,
  fetchReceptionDetail,
  resolveReceptionBySupplierDocument,
}: PurchaseDocumentBuilderProps) {
  const router = useRouter();
  const reference = usePurchaseDocumentReferenceData();
  const suppliers = reference.status === "ready" ? reference.suppliers : EMPTY_SUPPLIER_LIST;
  const storages = reference.status === "ready" ? reference.storages : EMPTY_STORAGE_LIST;
  const taxes = reference.status === "ready" ? reference.taxes : EMPTY_TAX_LIST;
  const branchId = reference.status === "ready" ? reference.branchId : "";
  const companyBankAccounts = reference.status === "ready" ? reference.companyBankAccounts : EMPTY_COMPANY_BANKS;
  const cashHubs = reference.status === "ready" ? reference.cashHubs : EMPTY_CASH_HUB_LIST;
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
  const cashHubOptions: Option[] = useMemo(
    () =>
      cashHubs.map((h) => ({
        id: h.id,
        label: (h.name?.trim() || h.code?.trim() || h.id) as string,
      })),
    [cashHubs],
  );

  const documentKindOptions: Option[] = useMemo(
    () => [
      { id: "invoice", label: "Factura" },
      { id: "receipt", label: "Boleta" },
      { id: "guide", label: "Guía de despacho" },
      { id: "other", label: "Otro" },
    ],
    [],
  );

  const loadLinesModeOptions: Option[] = useMemo(
    () => [
      { id: "id", label: "ID recepción" },
      { id: "invoice", label: "Factura / referencia" },
    ],
    [],
  );

  const showLineTaxes = mode !== "purchase_return";
  const [lines, setLines] = useState<PurchaseDocumentLine[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<string | null>(null);
  const [docDate, setDocDate] = useState(todayIsoDate);
  const [docKind, setDocKind] = useState<string>("invoice");
  const [docReference, setDocReference] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [receptionPaymentOpen, setReceptionPaymentOpen] = useState(false);
  const [receptionPaymentDraft, setReceptionPaymentDraft] =
    useState<ReceptionSupplierDocumentPaymentPayload | null>(null);
  const [externalReference, setExternalReference] = useState("");
  const [sourceReceptionId, setSourceReceptionId] = useState<string | null>(null);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [loadMode, setLoadMode] = useState<"id" | "invoice">("id");
  const [loadReceptionIdInput, setLoadReceptionIdInput] = useState("");
  const [loadInvoiceRefInput, setLoadInvoiceRefInput] = useState("");
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Impresión automática de órdenes de compra (A4 por defecto).
  const { contentRef: poPrintRef, handlePrint: printPurchaseOrder } = usePrint(
    "orden-compra",
    "A4",
    "portrait",
  );
  const [poPrintModel, setPoPrintModel] = useState<{
    company: PrintableCompanyInfo;
    order: PurchaseOrderPrintModel;
  } | null>(null);

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [previewCompany, setPreviewCompany] = useState<PrintableCompanyInfo | null>(null);

  useEffect(() => {
    if (!printPreviewOpen) {
      return;
    }
    let cancelled = false;
    setPreviewCompany(null);
    void getCompanyDetailsAction()
      .then((d) => {
        if (!cancelled) {
          setPreviewCompany(printableCompanyFromDetails(d));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewCompany(printableCompanyFromDetails(null));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [printPreviewOpen]);

  const selectedStorageLabel = useMemo(() => {
    const storageTrim = storageId?.trim();
    if (!storageTrim) {
      return null;
    }
    return storageOptions.find((o) => String(o.id) === String(storageTrim))?.label ?? null;
  }, [storageId, storageOptions]);

  const previewPurchaseOrderLines = useMemo<CreatePurchaseOrderLineInput[]>(
    () =>
      lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        productName: l.productName,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxIds: l.taxIds,
        attributeValues: { ...l.attributeValues },
      })),
    [lines],
  );

  const selectedSupplierOption = useMemo(() => {
    if (supplierId == null || supplierId === "") {
      return null;
    }
    return supplierOptions.find((o) => String(o.id) === String(supplierId)) ?? null;
  }, [supplierId, supplierOptions]);

  const selectedSupplierRow = useMemo(() => {
    if (supplierId == null || supplierId === "") {
      return null;
    }
    return activeSuppliers.find((s) => String(s.id) === String(supplierId)) ?? null;
  }, [supplierId, activeSuppliers]);

  const supplierPrintIdentity = useMemo(
    () => buildSupplierIdentityPrintFields(selectedSupplierRow),
    [selectedSupplierRow],
  );

  const receptionShowDocumentKindInPrint = useMemo(
    () => !(docKind === "other" && !docReference.trim()),
    [docKind, docReference],
  );

  const supplierPrintForDocuments = useMemo((): SupplierPrintSummaryModel => {
    const refTrim = docReference.trim();
    const includeRefInSupplierBlock =
      mode === "reception" && receptionShowDocumentKindInPrint && Boolean(refTrim);
    return {
      commercialName: selectedSupplierOption?.label ?? null,
      identity: supplierPrintIdentity,
      documentReference: includeRefInSupplierBlock ? refTrim : null,
    };
  }, [
    mode,
    selectedSupplierOption,
    supplierPrintIdentity,
    docReference,
    receptionShowDocumentKindInPrint,
  ]);

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

  const updateLine = useCallback(
    (key: string, patch: Partial<Pick<PurchaseDocumentLine, "quantity" | "unitPrice" | "taxIds">>) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.key !== key) {
            return l;
          }
          let next: PurchaseDocumentLine = { ...l, ...patch };
          if (mode === "purchase_return" && patch.quantity != null) {
            let q = Number(patch.quantity);
            if (!Number.isFinite(q)) {
              q = l.quantity;
            }
            const max = l.maxReturnQuantity;
            if (max != null && max > 0 && q > max) {
              q = max;
            }
            if (q < 0.01) {
              q = 0.01;
            }
            next = { ...next, quantity: q };
          }
          return next;
        }),
      );
    },
    [mode],
  );

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

  const appliedTaxNames = useMemo(() => {
    const taxById = new Map(activeTaxes.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const names: string[] = [];
    for (const line of lines) {
      for (const tid of line.taxIds) {
        const t = taxById.get(tid);
        const n = t?.name?.trim();
        if (n && !seen.has(n)) {
          seen.add(n);
          names.push(n);
        }
      }
    }
    return names;
  }, [lines, activeTaxes]);

  const supplierFiscalTaxInfo = useMemo(() => {
    const taxById = new Map(activeTaxes.map((t) => [t.id, t]));
    for (const line of lines) {
      for (const tid of line.taxIds) {
        if (taxById.has(tid)) {
          const t = taxById.get(tid)!;
          return { taxId: tid, taxRatePct: Number(t.rate) || 0 };
        }
      }
    }
    return { taxId: null as string | null, taxRatePct: 0 };
  }, [lines, activeTaxes]);

  const receptionPaymentForFiscal =
    docKind === "invoice" || docKind === "receipt"
      ? (receptionPaymentDraft ?? {
          mode: "PENDING" as const,
          paidLines: [],
          scheduledLines: [],
        })
      : null;

  const receptionPaymentSummaryText = useMemo(() => {
    if (!receptionPaymentForFiscal) {
      return "";
    }
    return formatReceptionPaymentSummary(receptionPaymentForFiscal);
  }, [receptionPaymentForFiscal]);

  const modeTitle =
    mode === "reception"
      ? "Ingresar recepción de compra"
      : mode === "purchase_return"
        ? "Nueva devolución de compra"
        : "Crear orden de compra";

  const canSavePurchaseReturnBase =
    mode === "purchase_return" && Boolean(onSavePurchaseReturn) && Boolean(branchId?.trim());
  const canConfirmPurchaseReturn =
    canSavePurchaseReturnBase &&
    Boolean(supplierId?.trim()) &&
    Boolean(storageId?.trim()) &&
    lines.length > 0;

  const showReceptionPaymentUi = mode === "reception" && (docKind === "invoice" || docKind === "receipt");

  useEffect(() => {
    if (docKind !== "invoice" && docKind !== "receipt") {
      setReceptionPaymentDraft(null);
    }
  }, [docKind]);

  useEffect(() => {
    if (!showReceptionPaymentUi) {
      setReceptionPaymentOpen(false);
    }
  }, [showReceptionPaymentUi]);

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
    (docKind === "invoice" || docKind === "receipt" || docKind === "guide" || docKind === "other");

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
        ...(documentNotes.trim() ? { notes: documentNotes.trim() } : {}),
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
          // Lanzar impresión automática ANTES de navegar al listado.
          try {
            const companyDetails = await getCompanyDetailsAction();
            const company = printableCompanyFromDetails(companyDetails);

            setPoPrintModel({
              company,
              order: {
                id: result.id,
                documentNumber: result.documentNumber ?? null,
                documentDate: docDate,
                storageLabel: selectedStorageLabel,
                lines: input.lines.map((dto, idx) => ({
                  ...dto,
                  attributeValues:
                    lines[idx] != null ? { ...lines[idx].attributeValues } : undefined,
                })),
                notes: documentNotes.trim() || null,
                subtotalNeto: summary.subtotalNeto,
                impuestosTotal: summary.impuestosTotal,
                total: summary.total,
                appliedTaxNames,
                supplierPrint: supplierPrintForDocuments,
              },
            });

            // Esperar a que React pinte el contenido en el DOM antes de imprimir.
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                printPurchaseOrder();
              });
            });
          } catch {
            // Si falla la impresión, igual navegamos.
          }
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
    [
      mode,
      onSavePurchaseOrder,
      branchId,
      supplierId,
      storageId,
      docDate,
      lines,
      router,
      selectedSupplierOption,
      selectedStorageLabel,
      printPurchaseOrder,
      documentNotes,
      summary,
      appliedTaxNames,
      supplierPrintForDocuments,
    ],
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
    if (docKind !== "invoice" && docKind !== "receipt" && docKind !== "guide" && docKind !== "other") {
      setSaveError("Seleccione tipo de documento.");
      return;
    }

    const input: CreateDirectReceptionInput = {
      branchId: branchId.trim(),
      storageId: storageId.trim(),
      supplierId: supplierId.trim(),
      reference: docReference.trim() || null,
      documentType: docKind as ReceptionDteType,
      notes: documentNotes.trim() || null,
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

    if (docKind === "invoice" || docKind === "receipt") {
      input.supplierDocumentPayment =
        receptionPaymentDraft ??
        ({
          mode: "PENDING",
          paidLines: [],
          scheduledLines: [],
        } as ReceptionSupplierDocumentPaymentPayload);
      input.supplierFiscalAmounts = {
        subtotalNeto: summary.subtotalNeto,
        taxAmount: summary.impuestosTotal,
        total: summary.total,
        taxId: supplierFiscalTaxInfo.taxId,
        taxRatePct: supplierFiscalTaxInfo.taxRatePct,
      };
    }

    setIsSaving(true);
    try {
      const result = await onSaveReception(input);
      if (result.success) {
        if (result.supplierDocumentError) {
          setSaveError(
            `La recepción se guardó, pero el documento de proveedor no quedó completo: ${result.supplierDocumentError}`,
          );
          return;
        }
        router.push("/purchasing/transactions/receptions");
      } else {
        setSaveError(result.error);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }, [
    mode,
    onSaveReception,
    branchId,
    storageId,
    supplierId,
    lines,
    docReference,
    docKind,
    documentNotes,
    router,
    receptionPaymentDraft,
    summary.subtotalNeto,
    summary.impuestosTotal,
    summary.total,
    supplierFiscalTaxInfo.taxId,
    supplierFiscalTaxInfo.taxRatePct,
  ]);

  const applyLoadedReception = useCallback((r: ReceptionDetailForReturn) => {
    const mapped = mapReceptionLinesToDocumentLines(r.lines);
    if (mapped.length === 0) {
      setLoadError("La recepción no tiene líneas con cantidad mayor a cero.");
      return;
    }
    setLines(mapped);
    if (r.supplierId?.trim()) {
      setSupplierId(r.supplierId.trim());
    }
    if (r.storageId?.trim()) {
      setStorageId(r.storageId.trim());
    }
    setSourceReceptionId(r.id);
    const d = r.createdAt?.trim();
    if (d && d.length >= 10) {
      setDocDate(d.slice(0, 10));
    }
    setLoadDialogOpen(false);
    setLoadError(null);
  }, []);

  const confirmLoadReception = useCallback(async () => {
    setLoadError(null);
    setLoadBusy(true);
    try {
      if (loadMode === "id") {
        const id = loadReceptionIdInput.trim();
        if (!id) {
          setLoadError("Ingrese el ID de la recepción.");
          return;
        }
        if (!fetchReceptionDetail) {
          setLoadError("La carga por ID no está configurada.");
          return;
        }
        const res = await fetchReceptionDetail(id);
        if (!res.success) {
          setLoadError(res.error);
          return;
        }
        applyLoadedReception(res.reception);
      } else {
        const ref = loadInvoiceRefInput.trim();
        if (!ref) {
          setLoadError("Ingrese número o referencia de factura.");
          return;
        }
        const sid = supplierId?.trim();
        if (!sid) {
          setLoadError("Seleccione primero el proveedor para buscar por factura.");
          return;
        }
        if (!resolveReceptionBySupplierDocument) {
          setLoadError("La búsqueda por factura no está configurada.");
          return;
        }
        const res = await resolveReceptionBySupplierDocument(sid, ref);
        if (!res.success) {
          setLoadError(res.error);
          return;
        }
        applyLoadedReception(res.reception);
      }
    } finally {
      setLoadBusy(false);
    }
  }, [
    loadMode,
    loadReceptionIdInput,
    loadInvoiceRefInput,
    supplierId,
    fetchReceptionDetail,
    resolveReceptionBySupplierDocument,
    applyLoadedReception,
  ]);

  const submitPurchaseReturn = useCallback(async () => {
    setSaveError(null);
    if (mode !== "purchase_return") {
      return;
    }
    if (!onSavePurchaseReturn) {
      setSaveError("No hay servicio de guardado configurado.");
      return;
    }
    if (!branchId?.trim()) {
      setSaveError("No hay sucursal configurada.");
      return;
    }
    if (!storageId?.trim()) {
      setSaveError("Seleccione almacén de salida.");
      return;
    }
    if (!supplierId?.trim()) {
      setSaveError("Seleccione un proveedor.");
      return;
    }
    if (lines.length === 0) {
      setSaveError("Cargue las líneas desde una recepción o factura.");
      return;
    }

    const dtoLines = lines.map((l) => {
      const qty = l.quantity;
      const unit = l.unitPrice;
      const subtotal = qty * unit;
      const taxAmount = 0;
      const taxRate = 0;
      const total = subtotal + taxAmount;
      return {
        quantity: qty,
        unitPrice: unit,
        productName: l.productName,
        productId: l.productId.trim() && UUID_RE.test(l.productId) ? l.productId : undefined,
        productVariantId: l.variantId.trim() && UUID_RE.test(l.variantId) ? l.variantId : undefined,
        sku: l.sku && l.sku !== "—" ? l.sku : undefined,
        subtotal,
        total,
        taxAmount,
        taxRate,
      };
    });

    const linesTotalSum = dtoLines.reduce((s, x) => s + x.total, 0);
    const input: CreatePurchaseReturnInput = {
      branchId: branchId.trim(),
      supplierId: supplierId.trim(),
      storageId: storageId.trim(),
      subtotal: summary.subtotalNeto,
      taxAmount: summary.impuestosTotal,
      discountAmount: 0,
      total: summary.total,
      externalReference: externalReference.trim() || null,
      notes: documentNotes.trim() || null,
      lines: dtoLines,
      metadata: {
        links: {
          receptionId: sourceReceptionId?.trim() || null,
          purchaseOrderId: null,
          supplierInvoiceId: null,
        },
      },
    };

    if (Math.abs(linesTotalSum - summary.total) > 0.02) {
      setSaveError("Inconsistencia en totales; revise cantidades y precios.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await onSavePurchaseReturn(input);
      if (result.success) {
        router.push("/purchasing/transactions/purchase-returns");
      } else {
        setSaveError(result.error);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  }, [
    mode,
    onSavePurchaseReturn,
    branchId,
    storageId,
    supplierId,
    lines,
    documentNotes,
    externalReference,
    summary.subtotalNeto,
    summary.impuestosTotal,
    summary.total,
    sourceReceptionId,
    router,
  ]);

  const rootLayoutClassName =
    mode === "purchase_return"
      ? "flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch"
      : "flex h-[calc(100dvh-5.25rem)] max-h-[calc(100dvh-5.25rem)] min-h-0 min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch";

  return (
    <div className={rootLayoutClassName} data-test-id="purchase-document-builder">
      {/* Contenido oculto para impresión automática de órdenes de compra */}
      <div className="sr-only" aria-hidden>
        <div ref={poPrintRef}>
          {poPrintModel ? (
            <PurchaseOrderPrintDocument company={poPrintModel.company} order={poPrintModel.order} />
          ) : null}
        </div>
      </div>

      {mode !== "purchase_return" ? (
        <PurchaseDocumentVariantSearchPanel
          variantSearch={variantSearch}
          searchQuery={searchQuery}
          searchPage={searchPage}
          onAddVariant={addVariant}
        />
      ) : null}

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-background p-3 lg:h-full lg:min-h-0"
        data-test-id="purchase-document-detail-panel"
      >
        <div className="flex w-full min-w-0 flex-col gap-3" data-test-id="purchase-doc-header-fields">
          {referenceError ? (
            <p className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
              {referenceError}
            </p>
          ) : null}
          <div className="grid w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-start">
            <div className="min-w-0 lg:max-w-[30vw] lg:justify-self-start">
              <h2
                className="text-sm font-semibold leading-snug text-foreground lg:pt-1"
                data-test-id="purchase-doc-title"
              >
                {modeTitle}
              </h2>
              {mode === "reception" && receptionPaymentSummaryText ? (
                <p
                  className="mt-1 max-w-full text-xs leading-snug text-muted-foreground"
                  data-test-id="purchase-doc-payment-summary"
                >
                  {receptionPaymentSummaryText}
                </p>
              ) : null}
            </div>
            <div className="min-w-0 flex flex-col gap-3">
              <div className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-x-3 gap-y-3">
                <div className="min-w-0">
                  <AutoComplete
                    label="Proveedor"
                    name="purchase-doc-supplier"
                    placeholder={referenceLoading ? "Cargando…" : "Buscar o seleccionar…"}
                    options={supplierOptions}
                    value={selectedSupplierOption}
                    onChange={(opt) => setSupplierId(opt ? String(opt.id) : null)}
                    alwaysShowLabel
                    density="compact"
                    disabled={referenceFieldsLocked}
                    data-test-id="purchase-doc-supplier"
                  />
                </div>
                <div className="min-w-0">
                  <TextField
                    label="Fecha"
                    name="purchase-doc-date"
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    density="compact"
                    className="w-full min-w-0"
                    data-test-id="purchase-doc-date"
                  />
                </div>
              </div>
              <div className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))] gap-x-3 gap-y-3">
                <div className="min-w-0">
                  <Select
                    label={mode === "purchase_return" ? "Almacén de salida" : "Almacén destino"}
                    name="purchase-doc-storage"
                    placeholder={referenceLoading ? "Cargando…" : "Seleccionar"}
                    options={storageOptions}
                    value={storageId}
                    onChange={(id) => setStorageId(id == null ? null : String(id))}
                    allowClear
                    alwaysShowLabel
                    density="compact"
                    disabled={referenceFieldsLocked}
                    className="w-full min-w-0"
                    data-test-id="purchase-doc-storage"
                  />
                </div>
                {mode === "reception" ? (
                  <>
                    <div className="min-w-0">
                      <Select
                        label="DTE/Documento"
                        name="purchase-doc-document-type"
                        placeholder="Seleccionar"
                        options={documentKindOptions}
                        value={docKind}
                        onChange={(id) => setDocKind(id == null ? "invoice" : String(id))}
                        alwaysShowLabel
                        density="compact"
                        className="w-full min-w-0"
                        data-test-id="purchase-doc-document-type"
                      />
                    </div>
                    <div className="min-w-0">
                      <TextField
                        label="Referencia"
                        name="purchase-doc-reference"
                        value={docReference}
                        onChange={(e) => setDocReference(e.target.value)}
                        placeholder="Número o referencia del documento del proveedor"
                        alwaysShowLabel
                        density="compact"
                        className="w-full min-w-0"
                        data-test-id="purchase-doc-reference"
                      />
                    </div>
                  </>
                ) : mode === "purchase_return" ? (
                  <div className="min-w-0">
                    <TextField
                      label="Referencia externa"
                      name="purchase-doc-external-ref"
                      value={externalReference}
                      onChange={(e) => setExternalReference(e.target.value)}
                      placeholder="Folio o referencia opcional"
                      alwaysShowLabel
                      density="compact"
                      className="w-full min-w-0"
                      data-test-id="purchase-doc-external-reference"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table
            className="w-full min-w-[720px] table-fixed border-collapse text-xs"
            data-test-id="purchase-doc-lines-table"
          >
            <colgroup>
              <col className="min-w-0" />
              <col className="w-36" />
              <col className="w-52" />
              {showLineTaxes ? <col className="min-w-[7.5rem] w-[8.25rem]" /> : null}
              <col className="w-36" />
              <col className="w-12" />
            </colgroup>
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 pr-2">Producto</th>
                <th className="py-1.5 pr-2">
                  {mode === "purchase_return" ? "Cantidad a devolver" : "Cantidad"}
                </th>
                <th className="py-1.5 pr-2">Precio de compra neto</th>
                {showLineTaxes ? <th className="py-1.5 pr-2">Impuestos</th> : null}
                <th className="py-1.5 pr-2 text-right">Subtotal</th>
                <th className="w-12 py-1.5 text-center"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={showLineTaxes ? 6 : 5} className="py-10">
                    <span className="sr-only">Sin líneas en el documento</span>
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.key} className="border-b border-border/70 align-top" data-test-id={`purchase-doc-line-${line.key}`}>
                    <td className="py-1.5 pr-2">
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
                    <td className="py-1.5 pr-2 align-middle">
                      <NumberStepper
                        value={line.quantity}
                        onChange={(v) =>
                          mode === "purchase_return"
                            ? updateLine(line.key, { quantity: Number(v) })
                            : updateLine(line.key, { quantity: Math.max(1, Math.round(Number(v))) })
                        }
                        min={mode === "purchase_return" ? 0.01 : 1}
                        max={mode === "purchase_return" ? (line.maxReturnQuantity ?? undefined) : undefined}
                        step={mode === "purchase_return" ? 0.01 : 1}
                        allowFloat={mode === "purchase_return"}
                        allowNegative={false}
                        data-test-id={`purchase-doc-qty-${line.key}`}
                      />
                    </td>
                    <td className="py-1.5 pr-2 align-middle">
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
                    {showLineTaxes ? (
                      <td className="py-1.5 pr-2 align-middle">
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
                    ) : null}
                    <td className="py-1.5 pr-2 align-middle text-right tabular-nums font-medium text-foreground">
                      {formatMoney(line.quantity * line.unitPrice)}
                    </td>
                    <td className="py-1.5 align-middle text-center">
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
            className="flex flex-col gap-1 rounded-lg border border-dashed border-border bg-muted/15 px-2.5 py-1.5 text-xs"
            data-test-id="purchase-doc-summary"
          >
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Subtotal neto</span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-subtotal-net">
                {formatMoney(summary.subtotalNeto)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 text-muted-foreground">
                <span>Impuestos</span>
                {appliedTaxNames.length > 0 ? (
                  <span className="text-muted-foreground/90">({appliedTaxNames.join(", ")})</span>
                ) : null}
              </span>
              <span className="tabular-nums font-medium text-foreground" data-test-id="purchase-doc-summary-taxes">
                {formatMoney(summary.impuestosTotal)}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-1.5">
              <span className="font-medium text-foreground">Total</span>
              <span className="tabular-nums font-semibold text-foreground" data-test-id="purchase-doc-summary-total">
                {formatMoney(summary.total)}
              </span>
            </div>
          </footer>
          <div className="w-full min-w-0 pt-3">
            <TextField
              label="Notas"
              name="purchase-doc-notes"
              value={documentNotes}
              onChange={(e) => setDocumentNotes(e.target.value)}
              placeholder="Observaciones para este documento (opcional)"
              alwaysShowLabel
              className="w-full min-w-0"
              disabled={isSaving}
              data-test-id="purchase-doc-notes"
            />
          </div>
          <div className="flex w-full flex-col gap-2 pt-3">
            {saveError ? (
              <p
                className="max-w-full text-right text-sm text-error"
                role="alert"
                data-test-id="purchase-doc-save-error"
              >
                {saveError}
              </p>
            ) : null}
            {(mode === "purchase_order" && onSavePurchaseOrder) ||
            (mode === "reception" && onSaveReception) ||
            (mode === "purchase_return" && onSavePurchaseReturn) ? (
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div className="flex shrink-0 items-center gap-1">
                  {backToListHref ? (
                    <IconButton
                      icon="ArrowLeft"
                      variant="basicSecondary"
                      size="md"
                      title={
                        mode === "reception"
                          ? "Volver a recepciones"
                          : mode === "purchase_return"
                            ? "Volver a devoluciones"
                            : "Volver a órdenes de compra"
                      }
                      ariaLabel={
                        mode === "reception"
                          ? "Volver a recepciones"
                          : mode === "purchase_return"
                            ? "Volver a devoluciones"
                            : "Volver a órdenes de compra"
                      }
                      disabled={isSaving || referenceLoading}
                      onClick={() => router.push(backToListHref)}
                      data-test-id="purchase-doc-back-to-list"
                    />
                  ) : null}
                  {mode === "purchase_return" && (fetchReceptionDetail || resolveReceptionBySupplierDocument) ? (
                    <IconButton
                      icon="Upload"
                      variant="basicSecondary"
                      size="md"
                      title="Cargar líneas desde recepción o factura"
                      ariaLabel="Cargar líneas desde recepción o factura"
                      disabled={isSaving || referenceLoading}
                      onClick={() => {
                        setLoadError(null);
                        setLoadDialogOpen(true);
                      }}
                      data-test-id="purchase-doc-load-lines"
                    />
                  ) : null}
                  {mode !== "purchase_return" ? (
                    <IconButton
                      icon="Printer"
                      variant="basicSecondary"
                      size="md"
                      title="Vista previa de impresión"
                      ariaLabel="Vista previa de impresión"
                      disabled={isSaving || referenceLoading}
                      onClick={() => setPrintPreviewOpen(true)}
                      data-test-id="purchase-doc-print-preview"
                    />
                  ) : null}
                  {showReceptionPaymentUi ? (
                    <IconButton
                      icon="CircleDollarSign"
                      variant="basicSecondary"
                      size="md"
                      title="Planificar pago del documento"
                      ariaLabel="Planificar pago del documento"
                      disabled={isSaving || referenceLoading}
                      onClick={() => setReceptionPaymentOpen(true)}
                      data-test-id="purchase-doc-payment-open"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
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
                      mode === "reception" || mode === "purchase_return"
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
                      (mode === "purchase_order"
                        ? !canConfirmPurchaseOrder
                        : mode === "reception"
                          ? !canConfirmReception
                          : !canConfirmPurchaseReturn)
                    }
                    onClick={() => {
                      if (mode === "purchase_order") {
                        void submitPurchaseOrder(false);
                      } else if (mode === "reception") {
                        void submitReception();
                      } else {
                        void submitPurchaseReturn();
                      }
                    }}
                    data-test-id="purchase-doc-save"
                    title={
                      mode === "purchase_order"
                        ? !canConfirmPurchaseOrder
                          ? "Orden confirmada: seleccione proveedor, líneas y sucursal."
                          : undefined
                        : mode === "reception"
                          ? !canConfirmReception
                            ? "Recepción: sucursal, proveedor, almacén, tipo de documento y al menos una línea."
                            : undefined
                          : !canConfirmPurchaseReturn
                            ? "Devolución: sucursal, proveedor, almacén y líneas cargadas desde una recepción."
                            : undefined
                    }
                  >
                    {isSaving ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {showReceptionPaymentUi ? (
        <PurchaseDocumentReceptionPaymentDialog
          open={receptionPaymentOpen}
          onClose={() => setReceptionPaymentOpen(false)}
          onApply={(payload) => {
            setReceptionPaymentDraft(payload);
            setReceptionPaymentOpen(false);
          }}
          documentTotal={summary.total}
          docDate={docDate}
          supplier={selectedSupplierRow}
          companyBankAccounts={companyBankAccounts}
          cashHubOptions={cashHubOptions}
          referenceLoading={referenceLoading}
          initialDraft={receptionPaymentDraft}
        />
      ) : null}

      <PrintDialog
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        title="Vista previa de impresión"
        fileName={mode === "purchase_order" ? "orden-compra" : "recepcion-compra"}
        pageSize="A4"
        pageOrientation="portrait"
        size="xl"
        fullWidth
        maxWidth={960}
        disablePrint={!previewCompany}
        printIconButton
        scroll="paper"
      >
        {previewCompany ? (
          mode === "purchase_order" ? (
            <PurchaseOrderPrintDocument
              company={previewCompany}
              order={{
                id: "preview",
                documentNumber: null,
                documentDate: docDate,
                storageLabel: selectedStorageLabel,
                lines: previewPurchaseOrderLines,
                notes: documentNotes.trim() || null,
                subtotalNeto: summary.subtotalNeto,
                impuestosTotal: summary.impuestosTotal,
                total: summary.total,
                appliedTaxNames,
                supplierPrint: supplierPrintForDocuments,
              }}
            />
          ) : (
            <ReceptionPrintDocument
              company={previewCompany}
              reception={{
                documentDate: docDate,
                internalFolio: null,
                storageLabel: selectedStorageLabel,
                supplierPrint: supplierPrintForDocuments,
                lines: lines.map((l) => ({
                  productName: l.productName,
                  sku: l.sku,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                })),
                notes: documentNotes.trim() || null,
                subtotalNeto: summary.subtotalNeto,
                impuestosTotal: summary.impuestosTotal,
                total: summary.total,
                appliedTaxNames,
                paymentSummary:
                  docKind === "invoice" || docKind === "receipt"
                    ? receptionPaymentSummaryText || null
                    : null,
              }}
            />
          )
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando datos de la empresa…</p>
        )}
      </PrintDialog>

      <Dialog
        open={loadDialogOpen}
        onClose={() => {
          if (!loadBusy) {
            setLoadDialogOpen(false);
          }
        }}
        title="Cargar líneas desde recepción"
        size="md"
        scroll="paper"
        hideActions
        showCloseButton
        data-test-id="purchase-doc-load-dialog"
      >
        <div className="flex flex-col gap-3 px-1 py-1">
          <Select
            label="Origen"
            name="purchase-doc-load-mode"
            options={loadLinesModeOptions}
            value={loadMode}
            onChange={(id) => setLoadMode(id === "invoice" ? "invoice" : "id")}
            alwaysShowLabel
            density="compact"
            className="w-full min-w-0"
            data-test-id="purchase-doc-load-mode"
          />
          {loadMode === "id" ? (
            <TextField
              label="ID recepción"
              name="purchase-doc-load-reception-id"
              value={loadReceptionIdInput}
              onChange={(e) => setLoadReceptionIdInput(e.target.value)}
              placeholder="UUID de la recepción"
              alwaysShowLabel
              density="compact"
              disabled={loadBusy}
              className="w-full min-w-0"
              data-test-id="purchase-doc-load-reception-id"
            />
          ) : (
            <>
              <p className="text-xs leading-snug text-muted-foreground">
                Se localiza la recepción más reciente del proveedor seleccionado cuyo DTE, número de documento o
                referencia coincide con el valor ingresado. Las líneas cargadas son siempre las de esa recepción (no
                las de la factura).
              </p>
              <TextField
                label="Número o referencia de factura"
                name="purchase-doc-load-invoice-ref"
                value={loadInvoiceRefInput}
                onChange={(e) => setLoadInvoiceRefInput(e.target.value)}
                placeholder="Ej. folio DTE o referencia guardada en la recepción"
                alwaysShowLabel
                density="compact"
                disabled={loadBusy}
                className="w-full min-w-0"
                data-test-id="purchase-doc-load-invoice-ref"
              />
            </>
          )}
          {loadError ? (
            <p className="text-sm text-error" role="alert">
              {loadError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              variant="outlinedSecondary"
              size="md"
              type="button"
              disabled={loadBusy}
              onClick={() => setLoadDialogOpen(false)}
              data-test-id="purchase-doc-load-cancel"
            >
              Cancelar
            </Button>
            <Button
              variant="outlined"
              size="md"
              type="button"
              loading={loadBusy}
              onClick={() => void confirmLoadReception()}
              data-test-id="purchase-doc-load-confirm"
            >
              Cargar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
