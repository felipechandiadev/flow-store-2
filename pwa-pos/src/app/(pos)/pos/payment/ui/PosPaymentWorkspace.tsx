"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Dialog,
  DotProgress,
  IconButton,
  Select,
  TextField,
} from "@/shared/admin-shared";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { makePaymentLineId } from "@/features/pos-cart/pos-payment.utils";
import type { PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

const PAYMENT_TYPE_OPTIONS: { id: PosPaymentMethodId; label: string }[] = [
  { id: "CASH", label: "Efectivo" },
  { id: "CREDIT_CARD", label: "Tarjeta crédito" },
  { id: "DEBIT_CARD", label: "Tarjeta débito" },
  { id: "TRANSFER", label: "Transferencia" },
  { id: "CHECK", label: "Cheque" },
];

type GuestCustomer = {
  name: string;
  document: string;
  phone: string;
};

/** Monto en pesos CLP (enteros). Acepta dígitos tal como los entrega `TextField` `type="currency"`. */
function parseAmountCLP(raw: string): number | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/** Para montos editables en línea (permite vacío → 0). */
function parseAmountCLPInput(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function PaymentCartReadOnlyRow({ line }: { line: PosCartLine }) {
  const q = Number(line.quantity) || 0;
  const lineGross = (Number(line.unitPriceWithTax) || 0) * q;
  const attrBits =
    line.attributes?.map((a) => String(a.attributeValue ?? "").trim()).filter(Boolean) ?? [];
  const nameWithAttrs = [line.productName, ...attrBits].filter(Boolean).join(" · ");
  const unit = line.unitSymbol?.trim() ? ` ${line.unitSymbol.trim()}` : "";
  const qtyPrice = `${q} × ${formatMoney(line.unitPriceWithTax)}${unit}`;
  const titleFull = `${nameWithAttrs} · ${qtyPrice} · ${formatMoney(lineGross)}`;
  return (
    <li
      className="flex items-center gap-2 px-3 py-1.5 text-sm"
      title={titleFull}
      data-test-id={`pos-payment-cart-line-${line.variantId}`}
    >
      <p className="min-w-0 flex-1 truncate text-foreground">
        <span className="font-medium">{nameWithAttrs}</span>
        <span className="font-normal text-muted-foreground">
          {" "}
          · {qtyPrice}
        </span>
      </p>
      <span className="shrink-0 tabular-nums font-semibold text-foreground">{formatMoney(lineGross)}</span>
    </li>
  );
}

export default function PosPaymentWorkspace() {
  const router = useRouter();
  const cart = usePosCart();
  const { payments, setPayments } = cart;
  const saleTitleId = useId();
  const [addOpen, setAddOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [draftType, setDraftType] = useState<PosPaymentMethodId>("CASH");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftReference, setDraftReference] = useState("");
  const [addAlert, setAddAlert] = useState("");

  const [customer, setCustomer] = useState<GuestCustomer | null>(null);
  const [draftCustomer, setDraftCustomer] = useState<GuestCustomer>({ name: "", document: "", phone: "" });

  const [pageAlert, setPageAlert] = useState("");
  const paymentCashFocusDoneRef = useRef(false);

  useEffect(() => {
    if (!cart.ready) return;
    if (cart.lines.length === 0) {
      router.replace("/pos");
    }
  }, [cart.ready, cart.lines.length, router]);

  const totals = useMemo(() => {
    return cart.lines.reduce(
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
  }, [cart.lines]);

  const taxes = Math.max(0, totals.gross - totals.net);
  const discounts = 0;
  const saleTotal = totals.gross;

  useEffect(() => {
    if (!cart.ready || saleTotal <= 0) return;
    setPayments((prev) => {
      if (prev.length > 0) return prev;
      return [{ id: makePaymentLineId(), type: "CASH", amount: 0, reference: "" }];
    });
  }, [cart.ready, saleTotal, payments.length, setPayments]);

  const appliedTotal = useMemo(() => payments.reduce((a, p) => a + p.amount, 0), [payments]);
  const remaining = Math.max(0, saleTotal - appliedTotal);
  const overpay = Math.max(0, appliedTotal - saleTotal);

  const requiresRef = (t: PosPaymentMethodId) => t === "CREDIT_CARD" || t === "DEBIT_CARD" || t === "TRANSFER";

  const openAddPayment = useCallback(() => {
    setDraftType("CASH");
    setDraftAmount(remaining > 0 ? String(Math.round(remaining)) : "");
    setDraftReference("");
    setAddAlert("");
    setAddOpen(true);
  }, [remaining]);

  const addPayment = useCallback(() => {
    setAddAlert("");
    const amt = parseAmountCLP(draftAmount);
    if (amt == null) {
      setAddAlert("Ingresa un monto válido mayor a cero.");
      return;
    }
    if (
      draftType !== "CASH" &&
      amt > remaining + 0.01 &&
      remaining > 0
    ) {
      setAddAlert("El monto no puede superar el saldo restante.");
      return;
    }
    if (requiresRef(draftType) && !draftReference.trim()) {
      setAddAlert("La referencia o autorización es obligatoria para este método.");
      return;
    }
    setPayments((prev) => [
      ...prev,
      {
        id: makePaymentLineId(),
        type: draftType,
        amount: amt,
        reference: draftReference.trim(),
      },
    ]);
    setAddOpen(false);
  }, [draftAmount, draftReference, draftType, remaining, setPayments]);

  const removePayment = useCallback(
    (id: string) => {
      setPayments((prev) => prev.filter((p) => p.id !== id));
    },
    [setPayments],
  );

  const updatePaymentLineAmount = useCallback(
    (id: string, raw: string) => {
      const next = parseAmountCLPInput(raw);
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, amount: next } : p)));
    },
    [setPayments],
  );

  const updatePaymentLineReference = useCallback(
    (id: string, reference: string) => {
      setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, reference } : p)));
    },
    [setPayments],
  );

  useEffect(() => {
    if (payments.length === 0) {
      paymentCashFocusDoneRef.current = false;
      return;
    }
    if (paymentCashFocusDoneRef.current) return;
    paymentCashFocusDoneRef.current = true;
    const t = window.setTimeout(() => {
      document
        .querySelector<HTMLInputElement>('input[data-test-id="pos-payment-default-cash-amount"]')
        ?.focus();
    }, 64);
    return () => clearTimeout(t);
  }, [payments.length]);

  const paymentStatusLabel = useMemo(() => {
    if (saleTotal <= 0) return "Sin total";
    if (remaining <= 0.01 && payments.length > 0) return "Pago completo";
    if (payments.length === 0) return "Pendiente";
    return "Falta monto";
  }, [saleTotal, remaining, payments.length]);

  const paymentStatusTone =
    remaining <= 0.01 && payments.length > 0
      ? "text-emerald-700 dark:text-emerald-400"
      : payments.length > 0
        ? "text-amber-700 dark:text-amber-400"
        : "text-muted-foreground";

  const canConfirm =
    cart.lines.length > 0 &&
    saleTotal > 0 &&
    payments.length > 0 &&
    remaining <= 0.01 &&
    payments.every((p) => !requiresRef(p.type) || p.reference.trim());

  const validateConfirm = (): string => {
    if (cart.lines.length === 0) return "El carrito está vacío.";
    if (saleTotal <= 0) return "El total debe ser mayor que cero.";
    if (payments.length === 0) return "Agrega al menos un método de pago.";
    if (remaining > 0.01) return "Cubre el saldo restante antes de confirmar.";
    for (const p of payments) {
      if (requiresRef(p.type) && !p.reference.trim()) return "Completa referencia/autorización para tarjeta o transferencia.";
    }
    return "";
  };

  const handleConfirm = async () => {
    const err = validateConfirm();
    setPageAlert("");
    if (err) {
      setPageAlert(err);
      return;
    }
    setConfirmLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    setConfirmLoading(false);
    setSuccessOpen(true);
  };

  const openCustomerDialog = useCallback(() => {
    setDraftCustomer(
      customer ?? {
        name: "",
        document: "",
        phone: "",
      },
    );
    setCustomerOpen(true);
  }, [customer]);

  const saveCustomer = useCallback(() => {
    const name = draftCustomer.name.trim();
    if (!name) return;
    setCustomer({
      name,
      document: draftCustomer.document.trim(),
      phone: draftCustomer.phone.trim(),
    });
    setCustomerOpen(false);
  }, [draftCustomer]);

  const customerLabel =
    customer?.name?.trim() ||
    (customer?.document?.trim() ? `Doc. ${customer.document.trim()}` : null) ||
    "Cliente no seleccionado";

  if (!cart.ready || cart.lines.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <DotProgress />
        <span>Volviendo al POS…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-28 lg:pb-0">
      {/* Context bar (debajo del TopBar global) */}
      <header
        className="flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        aria-labelledby={saleTitleId}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center">
          <IconButton
            icon="ChevronLeft"
            variant="outlined"
            size="md"
            ariaLabel="Volver al POS"
            title="Volver al POS"
            onClick={() => router.push("/pos")}
            className="mt-0.5 shrink-0 sm:mt-0"
            data-test-id="pos-payment-back"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 id={saleTitleId} className="text-base font-semibold text-foreground">
              Venta en curso
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{customerLabel}</span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:ps-2">
          <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-sm font-semibold tabular-nums text-foreground">
            Total {formatMoney(saleTotal)}
          </span>
        </div>
      </header>

      {pageAlert ? (
        <Alert variant="error">
          <strong className="block font-semibold">No se puede confirmar</strong>
          <span className="mt-1 block text-sm">{pageAlert}</span>
        </Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        {/* Columna izquierda — resumen */}
        <div className="flex min-w-0 flex-col gap-4">
          <section
            className="rounded-xl border border-border bg-background p-4 shadow-sm"
            aria-label="Resumen de carrito"
            data-test-id="pos-payment-cart-summary"
          >
            <h2 className="text-sm font-semibold text-foreground">Resumen del carrito</h2>
            <ul
              className="mt-4 max-h-[min(40vh,360px)] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/15 pr-1"
              data-test-id="pos-payment-cart-lines-readonly"
            >
              {cart.lines.map((line) => (
                <PaymentCartReadOnlyRow key={line.variantId} line={line} />
              ))}
            </ul>

            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal neto</span>
                <span className="font-medium tabular-nums text-foreground">{formatMoney(totals.net)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Impuestos</span>
                <span className="font-medium tabular-nums text-foreground">{formatMoney(taxes)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Descuentos</span>
                <span className="font-medium tabular-nums text-foreground">{formatMoney(discounts)}</span>
              </div>
              <div className="flex justify-between gap-4 pt-1 text-base font-semibold">
                <span className="text-foreground">Total</span>
                <span className="tabular-nums text-foreground">{formatMoney(saleTotal)}</span>
              </div>
            </div>
          </section>

          <section
            className="rounded-xl border border-border bg-background p-4 shadow-sm"
            aria-label="Información del cliente"
            data-test-id="pos-payment-customer"
          >
            <h2 className="text-sm font-semibold text-foreground">Información del cliente</h2>
            {customer ? (
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Nombre</dt>
                  <dd className="font-medium text-foreground">{customer.name}</dd>
                </div>
                {customer.document ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Documento</dt>
                    <dd className="font-mono text-foreground">{customer.document}</dd>
                  </div>
                ) : null}
                {customer.phone ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Teléfono</dt>
                    <dd className="text-foreground">{customer.phone}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Sin cliente asociado. Puedes continuar o registrar datos para el comprobante.
              </p>
            )}
            <div className="mt-4">
              <Button type="button" variant="outlined" size="sm" onClick={openCustomerDialog}>
                {customer ? "Cambiar cliente" : "Seleccionar o crear cliente"}
              </Button>
            </div>
          </section>
        </div>

        {/* Columna derecha — cobro */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <section
            className="rounded-xl border border-border bg-background p-4 shadow-sm"
            data-test-id="pos-payment-methods"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Métodos de pago</h2>
              <IconButton
                icon="Plus"
                variant="ghost"
                size="md"
                ariaLabel="Agregar método de pago"
                title="Agregar método de pago"
                onClick={openAddPayment}
                disabled={remaining <= 0.01}
                data-test-id="pos-payment-add-method"
              />
            </div>

            <ul className="mt-4 space-y-3">
              {payments.map((p, index) => {
                const label = PAYMENT_TYPE_OPTIONS.find((o) => o.id === p.type)?.label ?? p.type;
                const amountValue = String(Math.max(0, Math.round(p.amount)));
                return (
                  <li
                    key={p.id}
                    className="rounded-lg border border-border bg-muted/20 p-3"
                    data-test-id={`pos-payment-method-row-${p.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <IconButton
                        icon="X"
                        variant="ghost"
                        size="sm"
                        ariaLabel="Quitar método"
                        onClick={() => removePayment(p.id)}
                      />
                    </div>
                    <div className="mt-3 grid gap-3">
                      <TextField
                        type="currency"
                        label="Monto"
                        name={`pos-payment-line-${index}`}
                        value={amountValue}
                        onChange={(e) => updatePaymentLineAmount(p.id, e.target.value)}
                        alwaysShowLabel
                        currencySymbol="$"
                        density="compact"
                        data-test-id={
                          index === 0 ? "pos-payment-default-cash-amount" : `pos-payment-line-amount-${p.id}`
                        }
                      />
                      {requiresRef(p.type) ? (
                        <TextField
                          label="Referencia o autorización"
                          name={`pos-payment-ref-${p.id}`}
                          value={p.reference}
                          onChange={(e) => updatePaymentLineReference(p.id, e.target.value)}
                          placeholder="Obligatorio para este método"
                          alwaysShowLabel
                          density="compact"
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 space-y-2 rounded-lg bg-muted/30 px-3 py-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Saldo restante</span>
                <span className="font-semibold tabular-nums text-foreground">{formatMoney(remaining)}</span>
              </div>
              {overpay > 0 ? (
                <div className="flex justify-between gap-4 text-amber-800 dark:text-amber-300">
                  <span>Monto aplicado sobre total</span>
                  <span className="font-medium tabular-nums">{formatMoney(overpay)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-muted-foreground">Estado</span>
                <span className={`font-semibold ${paymentStatusTone}`}>{paymentStatusLabel}</span>
              </div>
            </div>

            <div className="mt-6 hidden lg:block">
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!canConfirm || confirmLoading}
                loading={confirmLoading}
                onClick={() => void handleConfirm()}
                data-test-id="pos-payment-confirm-desktop"
              >
                Confirmar pago
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* Móvil: CTA fijo */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canConfirm || confirmLoading}
          loading={confirmLoading}
          onClick={() => void handleConfirm()}
          data-test-id="pos-payment-confirm-mobile"
        >
          Confirmar pago
        </Button>
      </div>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Agregar método de pago"
        size="sm"
        alertArea={addAlert ? <Alert variant="error">{addAlert}</Alert> : undefined}
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={addPayment}>
              Agregar
            </Button>
          </>
        }
        data-test-id="pos-payment-add-method-dialog"
      >
        <div className="grid gap-4">
          <Select
            label="Tipo de pago"
            alwaysShowLabel
            value={draftType}
            onChange={(id) => setDraftType((id as PosPaymentMethodId) ?? "CASH")}
            options={[...PAYMENT_TYPE_OPTIONS]}
          />
          <TextField
            type="currency"
            label="Monto"
            name="payment-amount"
            value={draftAmount}
            onChange={(e) => setDraftAmount(e.target.value)}
            placeholder="Monto"
            alwaysShowLabel
            currencySymbol="$"
            required
            data-test-id="pos-payment-add-amount"
          />
          <TextField
            label={requiresRef(draftType) ? "Referencia o autorización" : "Referencia (opcional)"}
            name="payment-ref"
            value={draftReference}
            onChange={(e) => setDraftReference(e.target.value)}
            placeholder={requiresRef(draftType) ? "Obligatorio para este método" : "Opcional"}
            alwaysShowLabel
          />
        </div>
      </Dialog>

      <Dialog
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title={customer ? "Cambiar cliente" : "Cliente"}
        size="sm"
        actions={
          <>
            <Button type="button" variant="outlined" onClick={() => setCustomerOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="primary" onClick={saveCustomer} disabled={!draftCustomer.name.trim()}>
              Guardar
            </Button>
          </>
        }
        data-test-id="pos-payment-customer-dialog"
      >
        <div className="grid gap-4">
          <TextField
            label="Nombre completo"
            name="cust-name"
            value={draftCustomer.name}
            onChange={(e) => setDraftCustomer((c) => ({ ...c, name: e.target.value }))}
            placeholder="Nombre completo"
            alwaysShowLabel
            required
          />
          <TextField
            label="Documento"
            name="cust-doc"
            value={draftCustomer.document}
            onChange={(e) => setDraftCustomer((c) => ({ ...c, document: e.target.value }))}
            placeholder="RUT / documento"
            alwaysShowLabel
          />
          <TextField
            label="Teléfono"
            name="cust-phone"
            value={draftCustomer.phone}
            onChange={(e) => setDraftCustomer((c) => ({ ...c, phone: e.target.value }))}
            placeholder="Teléfono"
            alwaysShowLabel
          />
        </div>
      </Dialog>

      <Dialog
        open={successOpen}
        onClose={() => {
          setSuccessOpen(false);
          cart.clear();
          router.push("/pos");
        }}
        title="Venta registrada"
        size="sm"
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setSuccessOpen(false);
              cart.clear();
              router.push("/pos");
            }}
          >
            Volver al POS
          </Button>
        }
        actionsJustify="end"
        data-test-id="pos-payment-success-dialog"
      >
        <p className="text-sm text-muted-foreground">
          La venta quedó registrada en esta sesión (UI de demostración). La integración con{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /cash-sessions/sales</code> se conectará en una
          siguiente iteración.
        </p>
      </Dialog>
    </div>
  );
}
