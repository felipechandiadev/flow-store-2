"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { readCartClient, writeCartClient, type LoadedQuotationMeta } from "./cart-storage";
import type { PosSaleCustomer } from "@/features/customers/types/pos-customer.types";
import type { PosPaymentLine } from "./pos-payment.types";

type PosCartContextValue = {
  ready: boolean;
  lines: PosCartLine[];
  itemsCount: number;
  addItem: (item: PosProductSearchItem, quantity?: number) => void;
  increment: (variantId: string) => void;
  decrement: (variantId: string) => void;
  /** Reemplaza completamente las líneas (p.ej., cargar cotización). */
  replaceLines: (lines: PosCartLine[]) => void;
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

export default function PosCartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<PosCartLine[]>([]);
  const [saleCustomer, setSaleCustomer] = useState<PosSaleCustomer | null>(null);
  const [payments, setPayments] = useState<PosPaymentLine[]>([]);
  const [loadedQuotation, setLoadedQuotation] =
    useState<LoadedQuotationMeta | null>(null);
  const [scope, setScope] = useState<{ pointOfSaleId: string; priceListId: string } | null>(null);

  useEffect(() => {
    const s = cartScope();
    setScope(s);
    if (!s) {
      setLines([]);
      setSaleCustomer(null);
      setPayments([]);
      setLoadedQuotation(null);
      setReady(true);
      return;
    }
    const { lines: loadedLines, customer, quotation } = readCartClient(s);
    setLines(loadedLines);
    setSaleCustomer(customer);
    setPayments([]);
    setLoadedQuotation(quotation);
    setReady(true);
  }, []);

  // Persist on change (only after initial load).
  useEffect(() => {
    if (!ready || !scope) return;
    writeCartClient(scope, lines, saleCustomer, loadedQuotation);
  }, [lines, saleCustomer, loadedQuotation, ready, scope]);

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
        return;
      }
      const { lines: nextLines, customer, quotation } = readCartClient(s);
      setLines(nextLines);
      setSaleCustomer(customer);
      setPayments([]);
      setLoadedQuotation(quotation);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const itemsCount = useMemo(() => lines.reduce((a, l) => a + (Number(l.quantity) || 0), 0), [lines]);

  const addItem = useCallback((item: PosProductSearchItem, quantity = 1) => {
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
  }, []);

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

  const replaceLines = useCallback((next: PosCartLine[]) => {
    setLines(next);
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setPayments([]);
    setSaleCustomer(null);
    setLoadedQuotation(null);
  }, []);

  const value: PosCartContextValue = useMemo(
    () => ({
      ready,
      lines,
      itemsCount,
      addItem,
      increment,
      decrement,
      replaceLines,
      clear,
      saleCustomer,
      setSaleCustomer,
      payments,
      setPayments,
      loadedQuotation,
      setLoadedQuotation,
    }),
    [
      ready,
      lines,
      itemsCount,
      addItem,
      increment,
      decrement,
      replaceLines,
      clear,
      saleCustomer,
      payments,
      loadedQuotation,
    ],
  );

  return <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>;
}

export type { PosPaymentLine, PosPaymentMethodId } from "./pos-payment.types";

