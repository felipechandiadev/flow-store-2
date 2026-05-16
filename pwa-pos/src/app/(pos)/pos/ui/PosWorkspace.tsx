"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readPosContextClient, type PosContextV1 } from "@/features/session/lib/pos-context-storage";
import { Button, IconButton } from "@/shared/admin-shared";
import { ArrowUpFromLine, Package } from "lucide-react";
import PosProductSearchPanel, { POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH } from "./PosProductSearchPanel";
import PosCartLineCard from "./PosCartLineCard";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { LoadQuotationDialog } from "./LoadQuotationDialog";
import { BackorderDepositDialog } from "./BackorderDepositDialog";

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
  const [loadQuotationOpen, setLoadQuotationOpen] = useState(false);
  const [backorderDepositOpen, setBackorderDepositOpen] = useState(false);

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

  const totals = useMemo(
    () =>
      cart.lines.reduce(
        (acc, l) => {
          const q = Number(l.quantity) || 0;
          const net = (Number(l.unitPrice) || 0) * q;
          const gross = (Number(l.unitPriceWithTax) || 0) * q;
          acc.net += net;
          acc.gross += gross;
          return acc;
        },
        { net: 0, gross: 0 },
      ),
    [cart.lines],
  );
  const taxes = Math.max(0, totals.gross - totals.net);
  const lineDiscountsTotal = useMemo(
    () => cart.lines.reduce((acc, l) => acc + (l.discount?.discountAmount ?? 0), 0),
    [cart.lines],
  );
  const saleTotal = Math.max(0, totals.gross - lineDiscountsTotal - (cart.orderDiscount ?? 0));

  useEffect(() => {
    if (cart.lines.length > 0 || !cart.backorderDeposit) return;
    const id = window.setTimeout(() => cart.clearBackorderDeposit(), 0);
    return () => clearTimeout(id);
  }, [cart.lines.length, cart.backorderDeposit, cart.clearBackorderDeposit]);

  if (!ctx?.priceListId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Cargando contexto del punto de venta…
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100dvh-6rem)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch">
      <PosProductSearchPanel
        priceListId={priceListId}
        priceListOptions={priceListOptions}
        branchId={branchId}
        pointOfSaleId={ctx.pointOfSaleId}
        onPriceListChange={setPriceListId}
        onPickProduct={addProduct}
      />

      <aside
        className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
        style={{ height: `${POS_PRODUCT_SEARCH_PANEL_HEIGHT_VH}vh` }}
        data-test-id="pos-cart-panel"
      >
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Button
              variant="outlined"
              size="sm"
              onClick={() => setLoadQuotationOpen(true)}
              data-test-id="pos-load-quotation-btn"
              className="shrink-0"
            >
              <ArrowUpFromLine size={14} className="shrink-0" aria-hidden />
              <span>Cotización</span>
            </Button>
            <Button
              variant="outlined"
              size="sm"
              onClick={() => setBackorderDepositOpen(true)}
              disabled={cart.lines.length === 0 || saleTotal <= 0}
              title={
                cart.lines.length === 0
                  ? "Agregue ítems al carrito"
                  : "Definir abono de encargo"
              }
              data-test-id="pos-cart-backorder-btn"
              className="shrink-0"
            >
              <Package size={14} className="shrink-0" aria-hidden />
              <span>Encargo</span>
            </Button>
            {cart.backorderDeposit ? (
              <span
                className="max-w-[min(100%,10rem)] truncate text-xs font-semibold tabular-nums text-primary"
                title={`Abono ${cart.backorderDeposit.percent}% · ${formatMoney(cart.backorderDeposit.amount)}`}
                data-test-id="pos-cart-backorder-deposit-summary"
              >
                {formatMoney(cart.backorderDeposit.amount)}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({cart.backorderDeposit.percent}%)
                </span>
              </span>
            ) : null}
          </div>
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

        {cart.loadedQuotation ? (
          <div
            className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs"
            data-test-id="pos-cart-quotation-banner"
          >
            <div>
              <span className="text-muted-foreground">Cotización cargada:</span>{" "}
              <span className="font-mono font-semibold">
                {cart.loadedQuotation.documentNumber}
              </span>
              {cart.loadedQuotation.expired ? (
                <span className="ml-2 rounded bg-warning/20 px-1.5 py-0.5 text-warning">
                  Vencida
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => cart.setLoadedQuotation(null)}
              data-test-id="pos-cart-quotation-detach"
            >
              Desvincular
            </button>
          </div>
        ) : null}
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
                pointOfSaleId={ctx.pointOfSaleId}
                onIncrement={() => cart.increment(line.variantId)}
                onDecrement={() => cart.decrement(line.variantId)}
                onRemove={() => cart.remove(line.variantId)}
                onSetQuantity={(q) => cart.setQuantity(line.variantId, q)}
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

      <LoadQuotationDialog
        open={loadQuotationOpen}
        onClose={() => setLoadQuotationOpen(false)}
      />

      <BackorderDepositDialog
        open={backorderDepositOpen}
        onClose={() => setBackorderDepositOpen(false)}
        saleTotal={saleTotal}
        initial={cart.backorderDeposit}
        onConfirm={(config) => cart.setBackorderDeposit(config)}
      />
    </div>
  );
}
