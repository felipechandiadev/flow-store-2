"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readPosContextClient, type PosContextV1 } from "@/features/session/lib/pos-context-storage";
import { IconButton } from "@/shared/admin-shared";
import PosProductSearchPanel, { POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH } from "./PosProductSearchPanel";
import PosCartLineCard from "./PosCartLineCard";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

export default function PosWorkspace() {
  const router = useRouter();
  const [ctx, setCtx] = useState<PosContextV1 | null>(null);
  const [priceListId, setPriceListId] = useState("");
  const cart = usePosCart();

  useEffect(() => {
    const c = readPosContextClient();
    if (!c?.pointOfSaleId || !c?.priceListId) {
      router.replace("/session-setup");
      return;
    }
    setCtx(c);
    setPriceListId(String(c.priceListId));
  }, [router]);

  const priceListOptions = useMemo(() => {
    if (ctx?.priceLists?.length) return ctx.priceLists;
    if (ctx?.priceListId) return [{ id: ctx.priceListId, name: "Lista de precios" }];
    return [];
  }, [ctx]);

  const branchId = ctx?.branchId?.trim() ? ctx.branchId.trim() : null;

  const addProduct = useCallback((item: any) => cart.addItem(item), [cart]);

  if (!ctx?.priceListId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Cargando contexto del punto de venta…
      </div>
    );
  }

  const totals = cart.lines.reduce(
    (acc, l) => {
      const q = Number(l.quantity) || 0;
      const net = (Number(l.unitPrice) || 0) * q;
      const gross = (Number(l.unitPriceWithTax) || 0) * q;
      acc.net += net;
      acc.gross += gross;
      return acc;
    },
    { net: 0, gross: 0 },
  );
  const taxes = Math.max(0, totals.gross - totals.net);

  return (
    <div className="grid min-h-[calc(100dvh-6rem)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch">
      <PosProductSearchPanel
        priceListId={priceListId}
        priceListOptions={priceListOptions}
        branchId={branchId}
        onPriceListChange={setPriceListId}
        onPickProduct={addProduct}
      />

      <aside
        className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
        style={{ height: `${POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH}vh` }}
        data-test-id="pos-cart-panel"
      >
        <div className="flex shrink-0 items-start justify-end">
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-500" data-test-id="pos-cart-items-count">
              {cart.itemsCount} ítems
            </p>
            <IconButton
              icon="ShoppingCart"
              variant="basicSecondary"
              size="sm"
              ariaLabel="Carrito"
              data-test-id="pos-cart-icon"
            />
          </div>
        </div>
        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
          data-test-id="pos-cart-lines-scroll"
        >
          {cart.lines.length === 0 ? (
            <p className="text-sm text-zinc-500">Toca un producto en la lista para agregarlo.</p>
          ) : (
            cart.lines.map((line) => (
              <PosCartLineCard
                key={line.variantId}
                line={line}
                onIncrement={() => cart.increment(line.variantId)}
                onDecrement={() => cart.decrement(line.variantId)}
              />
            ))
          )}
        </div>

        <footer className="shrink-0 border-t border-border pt-3" data-test-id="pos-cart-summary">
          <div className="flex items-center justify-between gap-3">
            <div className="grid min-w-0 flex-1 gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal neto</span>
                <span className="font-medium text-foreground">{formatMoney(totals.net)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Impuestos</span>
                <span className="font-medium text-foreground">{formatMoney(taxes)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="text-sm font-semibold text-foreground">{formatMoney(totals.gross)}</span>
              </div>
            </div>
            <IconButton
              icon="CircleDollarSign"
              variant="outlined"
              size="lg"
              className="mx-6 shrink-0"
              ariaLabel="Ir a cobro"
              title="Ir a cobro"
              disabled={cart.lines.length === 0}
              onClick={() => router.push("/pos/payment")}
              data-test-id="pos-cart-checkout-icon"
            />
          </div>
        </footer>
      </aside>
    </div>
  );
}
