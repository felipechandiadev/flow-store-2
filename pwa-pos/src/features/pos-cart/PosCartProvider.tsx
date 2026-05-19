"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { readCartClient, writeCartClient, type LoadedQuotationMeta } from "./cart-storage";
import type { BackorderDepositConfig } from "./types/backorder-deposit.types";
import type {
  LoadedReturnSaleMeta,
  PosCartMode,
} from "./types/pos-cart-mode.types";
import type { PosSaleForReturn } from "@/features/pos-returns/types/pos-sale-for-return.types";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { PosPaymentLine } from "./pos-payment.types";
import { applyPromotions } from "@/features/promotions/lib/discount-engine";
import type {
  AppliedSnapshot,
  EffectivePromotion,
  EngineCartLine,
  EngineWarning,
  ManualSelection,
} from "@/features/promotions/lib/discount-engine.types";
import {
  listEffectivePromotionsAction,
  redeemPromotionCodeAction,
} from "@/features/promotions/actions/promotions-pos.action";

type PosCartContextValue = {
  ready: boolean;
  lines: PosCartLine[];
  itemsCount: number;
  addItem: (item: PosProductSearchItem, quantity?: number) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  remove: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  /** Reemplaza completamente las líneas (p.ej., cargar cotización). */
  replaceLines: (lines: PosCartLine[]) => void;
  /** Modalidad actual: venta normal o devolución de venta previa. */
  cartMode: PosCartMode;
  isReturnMode: boolean;
  loadedReturnSale: LoadedReturnSaleMeta | null;
  /** Carga carrito en modo devolución desde una venta (folio interno). */
  loadReturnFromSale: (sale: PosSaleForReturn, lines: PosCartLine[]) => void;
  /** Sale del modo devolución y vuelve a venta normal. */
  exitReturnMode: () => void;
  clear: () => void;
  /** Cliente de la venta (persistido con el carrito en localStorage). */
  saleCustomer: PosSaleCustomer | null;
  setSaleCustomer: React.Dispatch<React.SetStateAction<PosSaleCustomer | null>>;
  /** Líneas de pago (método, monto, ref.) compartidas entre `/pos` y `/pos/payment`. */
  payments: PosPaymentLine[];
  setPayments: React.Dispatch<React.SetStateAction<PosPaymentLine[]>>;
  /** Cotización origen del carrito (cuando se cargó vía folio). */
  loadedQuotation: LoadedQuotationMeta | null;
  setLoadedQuotation: React.Dispatch<
    React.SetStateAction<LoadedQuotationMeta | null>
  >;
  /** Abono de encargo (backorder) definido en pantalla de cobro. */
  backorderDeposit: BackorderDepositConfig | null;
  setBackorderDeposit: React.Dispatch<
    React.SetStateAction<BackorderDepositConfig | null>
  >;
  clearBackorderDeposit: () => void;
  /** Modalidad encargo (resumen y cobro por abono). */
  encargoModeEnabled: boolean;
  setEncargoModeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  /** Desactiva modalidad encargo y limpia abono. */
  disableEncargoMode: () => void;
  // ── Promociones ───────────────────────────────────────────────────
  /** Promociones efectivas cargadas desde el backend para este POS. */
  effectivePromotions: EffectivePromotion[];
  /** Promociones MANUAL/CODE_ENTRY que el cajero activó. */
  manualSelections: ManualSelection[];
  /** Resultado actual del motor — qué promos se están aplicando. */
  appliedPromotions: AppliedSnapshot[];
  /** Total de descuento a nivel de orden (post-líneas). */
  orderDiscount: number;
  /** Warnings emitidos por el motor (vence pronto, etc.). */
  promotionWarnings: EngineWarning[];
  /** Toggle manual de una promoción. */
  togglePromotion: (promotionId: string) => void;
  /** Canjea un cupón (CODE_ENTRY). Devuelve éxito o mensaje de error. */
  redeemCode: (code: string) => Promise<{ ok: boolean; message?: string }>;
  /** Refresca la lista de promociones efectivas desde el server. */
  refreshPromotions: () => Promise<void>;
};

const PosCartContext = createContext<PosCartContextValue | null>(null);

export function usePosCart(): PosCartContextValue {
  const ctx = useContext(PosCartContext);
  if (!ctx) {
    throw new Error("usePosCart must be used within PosCartProvider");
  }
  return ctx;
}

function cartScope(): { pointOfSaleId: string; priceListId: string } | null {
  const pos = readPosContextClient();
  const posId = pos?.pointOfSaleId?.trim();
  const priceListId = pos?.priceListId?.trim();
  if (!posId || !priceListId) return null;
  return { pointOfSaleId: posId, priceListId };
}

function readPosContextFull(): {
  companyId: string;
  branchId: string;
  pointOfSaleId: string;
} | null {
  const pos = readPosContextClient();
  const companyId = (pos as { companyId?: string } | null)?.companyId?.trim();
  const branchId = (pos as { branchId?: string } | null)?.branchId?.trim();
  const pointOfSaleId = pos?.pointOfSaleId?.trim();
  if (!companyId || !branchId || !pointOfSaleId) return null;
  return { companyId, branchId, pointOfSaleId };
}

export default function PosCartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [saleCustomer, setSaleCustomer] = useState<PosSaleCustomer | null>(null);
  const [payments, setPayments] = useState<PosPaymentLine[]>([]);
  const [loadedQuotation, setLoadedQuotation] =
    useState<LoadedQuotationMeta | null>(null);
  const [backorderDeposit, setBackorderDeposit] =
    useState<BackorderDepositConfig | null>(null);
  const [encargoModeEnabled, setEncargoModeEnabled] = useState(false);
  const [cartMode, setCartMode] = useState<PosCartMode>("sale");
  const [loadedReturnSale, setLoadedReturnSale] =
    useState<LoadedReturnSaleMeta | null>(null);
  const [scope, setScope] = useState<{ pointOfSaleId: string; priceListId: string } | null>(null);

  // ── Promociones ─────────────────────────────────────────────────
  const [effectivePromotions, setEffectivePromotions] = useState<EffectivePromotion[]>(
    [],
  );
  const [manualSelections, setManualSelections] = useState<ManualSelection[]>([]);
  const [appliedPromotions, setAppliedPromotions] = useState<AppliedSnapshot[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [promotionWarnings, setPromotionWarnings] = useState<EngineWarning[]>([]);

  useEffect(() => {
    const s = cartScope();
    setScope(s);
    if (!s) {
      setLines([]);
      setSaleCustomer(null);
      setPayments([]);
      setLoadedQuotation(null);
      setBackorderDeposit(null);
      setEncargoModeEnabled(false);
      setCartMode("sale");
      setLoadedReturnSale(null);
      setReady(true);
      return;
    }
    const {
      lines: loadedLines,
      customer,
      quotation,
      backorderDeposit: loadedDeposit,
      encargoModeEnabled: loadedEncargoMode,
      cartMode: loadedMode,
      loadedReturnSale: loadedReturn,
    } = readCartClient(s);
    setLines(loadedLines);
    setSaleCustomer(customer);
    setPayments([]);
    setLoadedQuotation(quotation);
    setBackorderDeposit(loadedDeposit);
    setEncargoModeEnabled(loadedEncargoMode);
    setCartMode(loadedMode);
    setLoadedReturnSale(loadedReturn);
    setReady(true);
  }, []);

  // Persist on change (only after initial load).
  useEffect(() => {
    if (!ready || !scope) return;
    writeCartClient(
      scope,
      lines,
      saleCustomer,
      loadedQuotation,
      backorderDeposit,
      cartMode,
      loadedReturnSale,
      encargoModeEnabled,
    );
  }, [
    lines,
    saleCustomer,
    loadedQuotation,
    backorderDeposit,
    encargoModeEnabled,
    cartMode,
    loadedReturnSale,
    ready,
    scope,
  ]);

  // If POS context changes (e.g. price list changed in settings), reload cart scope.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "flowstore.pos.context.v1") return;
      const s = cartScope();
      setScope(s);
      if (!s) {
        setLines([]);
        setSaleCustomer(null);
        setPayments([]);
        setLoadedQuotation(null);
        setBackorderDeposit(null);
        setEncargoModeEnabled(false);
        setCartMode("sale");
        setLoadedReturnSale(null);
        return;
      }
      const {
        lines: nextLines,
        customer,
        quotation,
        backorderDeposit: nextDeposit,
        encargoModeEnabled: nextEncargoMode,
        cartMode: nextMode,
        loadedReturnSale: nextReturn,
      } = readCartClient(s);
      setLines(nextLines);
      setSaleCustomer(customer);
      setPayments([]);
      setLoadedQuotation(quotation);
      setBackorderDeposit(nextDeposit);
      setEncargoModeEnabled(nextEncargoMode);
      setCartMode(nextMode);
      setLoadedReturnSale(nextReturn);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const itemsCount = useMemo(() => lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0), [lines]);

  const addItem = useCallback((item: PosProductSearchItem, quantity = 1) => {
    if (cartMode === "return") return;
    const q = Math.max(1, Math.round(Number(quantity) || 1));
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variantId === item.variantId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + q };
        return next;
      }
      return [...prev, { ...(item as any), quantity: q } as PosCartLine];
    });
  }, [cartMode]);

  const increment = useCallback((variantId: string) => {
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity + 1 } : l)));
  }, []);

  const decrement = useCallback((variantId: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) return;
    setLines((prev) =>
      prev.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l)),
    );
  }, []);

  const replaceLines = useCallback((next: PosCartLine[]) => {
    setCartMode("sale");
    setLoadedReturnSale(null);
    setLines(next);
  }, []);

  const loadReturnFromSale = useCallback(
    (sale: PosSaleForReturn, nextLines: PosCartLine[]) => {
      setCartMode("return");
      setLoadedReturnSale({
        id: sale.id,
        documentNumber: sale.documentNumber,
        total: Number(sale.total) || 0,
        createdAt: sale.createdAt,
      });
      setLoadedQuotation(null);
      setBackorderDeposit(null);
      setEncargoModeEnabled(false);
      setPayments([]);
      setManualSelections([]);
      setLines(nextLines);
      if (sale.customerName) {
        setSaleCustomer({
          customerId: sale.customerId,
          name: sale.customerName,
          document: sale.customerDocument ?? "",
          phone: "",
        });
      } else {
        setSaleCustomer(null);
      }
    },
    [],
  );

  const exitReturnMode = useCallback(() => {
    setCartMode("sale");
    setLoadedReturnSale(null);
    setLines([]);
    setPayments([]);
    setSaleCustomer(null);
    setManualSelections([]);
    setAppliedPromotions([]);
    setOrderDiscount(0);
    setPromotionWarnings([]);
  }, []);

  const clearBackorderDeposit = useCallback(() => {
    setBackorderDeposit(null);
  }, []);

  const disableEncargoMode = useCallback(() => {
    setEncargoModeEnabled(false);
    setBackorderDeposit(null);
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setPayments([]);
    setSaleCustomer(null);
    setLoadedQuotation(null);
    setBackorderDeposit(null);
    setEncargoModeEnabled(false);
    setCartMode("sale");
    setLoadedReturnSale(null);
    setManualSelections([]);
    setAppliedPromotions([]);
    setOrderDiscount(0);
    setPromotionWarnings([]);
  }, []);

  // ── Carga inicial de promociones efectivas ─────────────────────
  const refreshPromotions = useCallback(async () => {
    const ctx = readPosContextFull();
    if (!ctx) {
      setEffectivePromotions([]);
      return;
    }
    const res = await listEffectivePromotionsAction({
      branchId: ctx.branchId,
      pointOfSaleId: ctx.pointOfSaleId,
    });
    if (res.success) {
      setEffectivePromotions(res.promotions);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshPromotions();
  }, [ready, refreshPromotions]);

  // ── Re-cálculo reactivo del motor de descuentos ────────────────
  // Identidad de "lineas relevantes" para minimizar recomputes.
  const linesSignature = useMemo(
    () =>
      JSON.stringify(
        lines.map((l) => [l.variantId, l.quantity, l.unitPriceWithTax]),
      ),
    [lines],
  );
  const paymentsSignature = useMemo(
    () =>
      JSON.stringify(
        payments.map((p) => [p.companyPaymentMethodId ?? "", Number(p.amount) || 0]),
      ),
    [payments],
  );

  useEffect(() => {
    if (!ready) return;
    const ctx = readPosContextFull();
    if (!ctx) {
      setAppliedPromotions([]);
      setOrderDiscount(0);
      setPromotionWarnings([]);
      return;
    }
    const engineLines: EngineCartLine[] = lines.map((l) => ({
      lineId: l.variantId,
      variantId: l.variantId,
      productId: l.productId,
      categoryId: null,
      unitPrice: Number(l.unitPriceWithTax) || 0,
      quantity: Number(l.quantity) || 0,
      frozenDiscount:
        loadedQuotation || cartMode === "return" ? (l.discount ?? null) : null,
    }));

    const result = applyPromotions({
      cart: {
        lines: engineLines,
        customerId: saleCustomer?.customerId ?? null,
        paymentMethodIds: payments
          .filter((p) => (Number(p.amount) || 0) > 0)
          .map((p) => p.companyPaymentMethodId)
          .filter((x): x is string => !!x),
      },
      ctx: { ...ctx, now: new Date() },
      promotions: effectivePromotions,
      manualSelections,
      customerHistory: [],
    });

    setLines((prev) =>
      prev.map((l) => {
        const r = result.resolvedLines.find((x) => x.lineId === l.variantId);
        const nextDiscount = r?.discount ?? null;
        if ((l.discount ?? null) === nextDiscount) return l;
        return { ...l, discount: nextDiscount };
      }),
    );
    setOrderDiscount(result.orderDiscountAmount);
    setAppliedPromotions(result.appliedPromotions);
    setPromotionWarnings(result.warnings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    linesSignature,
    saleCustomer?.customerId,
    paymentsSignature,
    effectivePromotions,
    manualSelections,
    loadedQuotation,
    cartMode,
  ]);

  const togglePromotion = useCallback((promotionId: string) => {
    setManualSelections((prev) => {
      const exists = prev.some((m) => m.promotionId === promotionId);
      return exists
        ? prev.filter((m) => m.promotionId !== promotionId)
        : [...prev, { promotionId }];
    });
  }, []);

  const redeemCode = useCallback(
    async (code: string): Promise<{ ok: boolean; message?: string }> => {
      const ctx = readPosContextFull();
      if (!ctx) return { ok: false, message: "Sin contexto POS" };
      const res = await redeemPromotionCodeAction({
        code: code.trim(),
        branchId: ctx.branchId,
        pointOfSaleId: ctx.pointOfSaleId,
      });
      if (!res.success) return { ok: false, message: res.message };
      // Agrega al listado efectivo si no estaba.
      setEffectivePromotions((prev) =>
        prev.some((p) => p.id === res.promotion.id) ? prev : [...prev, res.promotion],
      );
      // Y la activa manualmente.
      setManualSelections((prev) =>
        prev.some((m) => m.promotionId === res.promotion.id)
          ? prev
          : [...prev, { promotionId: res.promotion.id }],
      );
      return { ok: true };
    },
    [],
  );

  const value: PosCartContextValue = useMemo(
    () => ({
      ready,
      lines,
      itemsCount,
      addItem,
      increment,
      decrement,
      remove,
      setQuantity,
      replaceLines,
      cartMode,
      isReturnMode: cartMode === "return",
      loadedReturnSale,
      loadReturnFromSale,
      exitReturnMode,
      clear,
      saleCustomer,
      setSaleCustomer,
      payments,
      setPayments,
      loadedQuotation,
      setLoadedQuotation,
      backorderDeposit,
      setBackorderDeposit,
      clearBackorderDeposit,
      encargoModeEnabled,
      setEncargoModeEnabled,
      disableEncargoMode,
      effectivePromotions,
      manualSelections,
      appliedPromotions,
      orderDiscount,
      promotionWarnings,
      togglePromotion,
      redeemCode,
      refreshPromotions,
    }),
    [
      ready,
      lines,
      itemsCount,
      addItem,
      increment,
      decrement,
      remove,
      setQuantity,
      replaceLines,
      cartMode,
      loadedReturnSale,
      loadReturnFromSale,
      exitReturnMode,
      clear,
      saleCustomer,
      payments,
      loadedQuotation,
      backorderDeposit,
      clearBackorderDeposit,
      encargoModeEnabled,
      disableEncargoMode,
      effectivePromotions,
      manualSelections,
      appliedPromotions,
      orderDiscount,
      promotionWarnings,
      togglePromotion,
      redeemCode,
      refreshPromotions,
    ],
  );

  return <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>;
}

export type { PosPaymentLine, PosPaymentMethodId } from "./pos-payment.types";

