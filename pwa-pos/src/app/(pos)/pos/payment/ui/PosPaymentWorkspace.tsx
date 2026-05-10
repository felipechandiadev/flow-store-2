"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
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
import type {
  PosPaymentLine,
  PosPaymentMethodId,
} from "@/features/pos-cart/pos-payment.types";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import { searchPosCustomersAction } from "@/features/customers/actions/customers-pos.action";
import type { PosCustomerSearchRow } from "@/features/customers/types/pos-customer.types";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import { getEffectivePosPaymentMethodsAction } from "@/features/pos-payment-methods/actions/payment-methods-pos.action";

/**
 * Alto de los paneles de la pantalla de cobro respecto al viewport (`vh`).
 * Más bajo que el panel de POS porque encima hay un header propio de la
 * pantalla (Venta en curso + Resumen del cobro + CTA) que consume altura.
 */
const POS_PAYMENT_PANEL_HEIGHT_VH = 76;

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

/**
 * Fallback estático cuando aún no llega la respuesta efectiva del backend.
 * Mantiene la UX previa (línea CASH precargada) mientras carga.
 */
const FALLBACK_PAYMENT_OPTIONS: { id: PosPaymentMethodId; label: string }[] = [
  { id: "CASH", label: "Efectivo" },
  { id: "CREDIT_CARD", label: "Tarjeta crédito" },
  { id: "DEBIT_CARD", label: "Tarjeta débito" },
  { id: "TRANSFER", label: "Transferencia" },
  { id: "CHECK", label: "Cheque" },
];

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
  const { payments, setPayments, saleCustomer: customer, setSaleCustomer: setCustomer } = cart;
  const saleTitleId = useId();
  const [addOpen, setAddOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  /**
   * Identificador de la opción seleccionada en el dialog "Agregar método".
   * Cuando hay catálogo efectivo es un `companyPaymentMethodId`; en fallback,
   * un `PosPaymentMethodId` (enum).
   */
  const [draftOptionId, setDraftOptionId] = useState<string>("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftReference, setDraftReference] = useState("");
  const [addAlert, setAddAlert] = useState("");

  const [draftCustomer, setDraftCustomer] = useState({ name: "", document: "", phone: "" });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<PosCustomerSearchRow[]>([]);

  const [pageAlert, setPageAlert] = useState("");
  const paymentCashFocusDoneRef = useRef(false);

  // ───── Medios de pago efectivos (merge company+POS) ────────────────────────
  const [effectiveMethods, setEffectiveMethods] = useState<EffectivePaymentMethod[]>([]);
  const [effectiveLoaded, setEffectiveLoaded] = useState(false);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ctx = readPosContextClient();
      const posId = ctx?.pointOfSaleId?.trim();
      if (!posId) {
        if (!cancelled) {
          setEffectiveLoaded(true);
        }
        return;
      }
      const res = await getEffectivePosPaymentMethodsAction({
        pointOfSaleId: posId,
      });
      if (cancelled) return;
      if (res.success) {
        setEffectiveMethods(res.paymentMethods);
        setEffectiveError(null);
      } else {
        setEffectiveMethods([]);
        setEffectiveError(res.message);
      }
      setEffectiveLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Index por `companyPaymentMethodId` para hidratar metadata por línea. */
  const methodsById = useMemo(() => {
    const map = new Map<string, EffectivePaymentMethod>();
    for (const m of effectiveMethods) map.set(m.companyPaymentMethodId, m);
    return map;
  }, [effectiveMethods]);

  /** Opciones del Select del dialog "Agregar método". */
  const paymentTypeOptions = useMemo(() => {
    if (effectiveMethods.length > 0) {
      return effectiveMethods.map((m) => ({
        id: m.companyPaymentMethodId,
        label: m.label,
      }));
    }
    return FALLBACK_PAYMENT_OPTIONS.map((o) => ({ id: o.id, label: o.label }));
  }, [effectiveMethods]);

  useEffect(() => {
    if (!cart.ready) return;
    if (cart.lines.length === 0) {
      router.replace("/pos");
    }
  }, [cart.ready, cart.lines.length, router]);

  useEffect(() => {
    const q = customerSearch.trim();
    if (q.length < 2) {
      setCustomerSearchResults([]);
      setCustomerSearchError("");
      setCustomerSearchLoading(false);
      return;
    }
    setCustomerSearchLoading(true);
    setCustomerSearchError("");
    const t = window.setTimeout(() => {
      void (async () => {
        const res = await searchPosCustomersAction({ query: q, page: 1, pageSize: 15 });
        setCustomerSearchLoading(false);
        if (res.success) {
          setCustomerSearchResults(res.customers);
        } else {
          setCustomerSearchResults([]);
          setCustomerSearchError(res.message);
        }
      })();
    }, 350);
    return () => {
      clearTimeout(t);
    };
  }, [customerSearch]);

  const pickSearchCustomer = useCallback((row: PosCustomerSearchRow) => {
    if (!row.customerId) return;
    setCustomer({
      customerId: row.customerId,
      name: row.displayName || "Cliente",
      document: row.documentNumber?.trim() ?? "",
      phone: row.phone?.trim() ?? "",
    });
    setCustomerSearch("");
    setCustomerSearchResults([]);
    setCustomerSearchError("");
  }, [setCustomer]);

  const clearSaleCustomer = useCallback(() => {
    setCustomer(null);
    setCustomerSearch("");
    setCustomerSearchResults([]);
    setCustomerSearchError("");
  }, [setCustomer]);

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
    if (!effectiveLoaded) return;
    setPayments((prev) => {
      if (prev.length > 0) return prev;
      // Catálogo efectivo: precargar líneas marcadas como `preloadOnPaymentScreen`,
      // ordenadas por `preloadOrder` (el backend ya las devuelve ordenadas).
      const preload = effectiveMethods.filter((m) => m.preloadOnPaymentScreen);
      if (preload.length > 0) {
        return preload.map((m) => ({
          id: makePaymentLineId(),
          type: m.method as PosPaymentMethodId,
          amount: 0,
          reference: "",
          companyPaymentMethodId: m.companyPaymentMethodId,
        }));
      }
      // Fallback: comportamiento previo (línea CASH precargada).
      return [
        {
          id: makePaymentLineId(),
          type: "CASH",
          amount: 0,
          reference: "",
          companyPaymentMethodId: null,
        },
      ];
    });
  }, [cart.ready, saleTotal, payments.length, setPayments, effectiveLoaded, effectiveMethods]);

  const appliedTotal = useMemo(() => payments.reduce((a, p) => a + p.amount, 0), [payments]);
  const remaining = Math.max(0, saleTotal - appliedTotal);
  const overpay = Math.max(0, appliedTotal - saleTotal);

  /**
   * Decide si una línea debe mostrar el campo "Referencia".
   * - Si hay catálogo efectivo: se respeta `requireReference` por config; además,
   *   métodos con tarjeta/transferencia siempre lo muestran como opcional.
   * - Fallback (sin catálogo): comportamiento previo basado en el enum.
   * La referencia **nunca** es obligatoria a nivel UI; lo controla la cuenta.
   */
  const showsRefField = useCallback(
    (line: { type: PosPaymentMethodId; companyPaymentMethodId?: string | null }) => {
      const cfg = line.companyPaymentMethodId ? methodsById.get(line.companyPaymentMethodId) : null;
      if (cfg) {
        if (cfg.requireReference) return true;
      }
      return (
        line.type === "CREDIT_CARD" ||
        line.type === "DEBIT_CARD" ||
        line.type === "TRANSFER"
      );
    },
    [methodsById],
  );

  const openAddPayment = useCallback(() => {
    // Si hay catálogo, draftOptionId es un `companyPaymentMethodId`.
    // Si no hay, es el enum (compat).
    const initialOptionId =
      effectiveMethods.length > 0
        ? effectiveMethods[0]?.companyPaymentMethodId ?? ""
        : "CASH";
    setDraftOptionId(initialOptionId);
    setDraftAmount(remaining > 0 ? String(Math.round(remaining)) : "");
    setDraftReference("");
    setAddAlert("");
    setAddOpen(true);
  }, [remaining, effectiveMethods]);

  const addPayment = useCallback(() => {
    setAddAlert("");
    const amt = parseAmountCLP(draftAmount);
    if (amt == null) {
      setAddAlert("Ingresa un monto válido mayor a cero.");
      return;
    }
    // Resolver type + companyPaymentMethodId a partir de la opción elegida.
    const cfg = methodsById.get(draftOptionId);
    const enumType: PosPaymentMethodId = cfg
      ? (cfg.method as PosPaymentMethodId)
      : (draftOptionId as PosPaymentMethodId) || "CASH";
    if (
      enumType !== "CASH" &&
      amt > remaining + 0.01 &&
      remaining > 0
    ) {
      setAddAlert("El monto no puede superar el saldo restante.");
      return;
    }
    setPayments((prev) => [
      ...prev,
      {
        id: makePaymentLineId(),
        type: enumType,
        amount: amt,
        reference: draftReference.trim(),
        companyPaymentMethodId: cfg?.companyPaymentMethodId ?? null,
      },
    ]);
    setAddOpen(false);
  }, [draftAmount, draftOptionId, draftReference, methodsById, remaining, setPayments]);

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

  const updatePaymentLineCheckField = useCallback(
    (id: string, field: keyof NonNullable<PosPaymentLine["checkData"]>, value: string) => {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                checkData: {
                  checkNumber: p.checkData?.checkNumber ?? "",
                  bankName: p.checkData?.bankName ?? "",
                  drawerName: p.checkData?.drawerName,
                  drawerDocument: p.checkData?.drawerDocument,
                  issueDate: p.checkData?.issueDate,
                  dueDate: p.checkData?.dueDate,
                  [field]: value,
                },
              }
            : p,
        ),
      );
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
    if (payments.length === 0) return "Sin pagos";
    if (overpay > 0) return "Pago con vuelto";
    if (remaining <= 0.01) return "Pago completo";
    return "Monto insuficiente";
  }, [saleTotal, remaining, overpay, payments.length]);

  const paymentStatusTone =
    payments.length > 0 && (overpay > 0 || remaining <= 0.01)
      ? "text-emerald-700 dark:text-emerald-400"
      : payments.length > 0
        ? "text-red-700 dark:text-red-400"
        : "text-muted-foreground";

  const paymentStatusBoxTone =
    payments.length > 0 && (overpay > 0 || remaining <= 0.01)
      ? "bg-emerald-100/70 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
      : payments.length > 0
        ? "bg-red-100/70 text-red-900 dark:bg-red-900/30 dark:text-red-100"
        : "bg-slate-100/80 text-slate-900 dark:bg-slate-800/40 dark:text-slate-100";

  const canConfirm =
    cart.lines.length > 0 &&
    saleTotal > 0 &&
    payments.length > 0 &&
    remaining <= 0.01;

  const validateConfirm = (): string => {
    if (cart.lines.length === 0) return "El carrito está vacío.";
    if (saleTotal <= 0) return "El total debe ser mayor que cero.";
    if (payments.length === 0) return "Agrega al menos un método de pago.";
    if (remaining > 0.01) return "Cubre el saldo restante antes de confirmar.";
    for (const p of payments) {
      if (p.type === "CHECK") {
        const cd = p.checkData;
        if (!cd?.checkNumber?.trim() || !cd?.bankName?.trim()) {
          return "Completa N° de cheque y banco para los pagos con cheque.";
        }
      }
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
    setDraftCustomer({
      name: customer?.name?.trim() ?? "",
      document: customer?.document?.trim() ?? "",
      phone: customer?.phone?.trim() ?? "",
    });
    setCustomerOpen(true);
  }, [customer]);

  const saveCustomer = useCallback(() => {
    const name = draftCustomer.name.trim();
    if (!name) return;
    setCustomer({
      customerId: null,
      name,
      document: draftCustomer.document.trim(),
      phone: draftCustomer.phone.trim(),
    });
    setCustomerOpen(false);
  }, [draftCustomer, setCustomer]);

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
        className="flex flex-col gap-4 rounded-xl border border-border bg-background px-4 py-3 shadow-sm lg:flex-row lg:items-center lg:gap-6"
        aria-labelledby={saleTitleId}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <IconButton
            icon="ChevronLeft"
            variant="outlined"
            size="md"
            ariaLabel="Volver al POS"
            title="Volver al POS"
            onClick={() => router.push("/pos")}
            className="shrink-0"
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

        <div
          className="flex shrink-0 flex-wrap items-stretch gap-2 text-sm"
          data-test-id="pos-payment-summary"
        >
          <div className="flex min-w-28 flex-col rounded-lg bg-slate-100/80 px-3 py-1.5 dark:bg-slate-800/40">
            <span className="text-xs text-slate-600 dark:text-slate-300">Total a pagar</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatMoney(saleTotal)}
            </span>
          </div>
          <div className="flex min-w-28 flex-col rounded-lg bg-sky-100/70 px-3 py-1.5 dark:bg-sky-900/30">
            <span className="text-xs text-sky-700 dark:text-sky-300">Total recibido</span>
            <span
              className="font-semibold tabular-nums text-sky-900 dark:text-sky-100"
              data-test-id="pos-payment-applied-total"
            >
              {formatMoney(appliedTotal)}
            </span>
          </div>
          {remaining > 0 ? (
            <div className="flex min-w-28 flex-col rounded-lg bg-amber-100/70 px-3 py-1.5 dark:bg-amber-900/30">
              <span className="text-xs text-amber-800 dark:text-amber-300">Saldo restante</span>
              <span className="font-semibold tabular-nums text-amber-900 dark:text-amber-100">
                {formatMoney(remaining)}
              </span>
            </div>
          ) : null}
          {overpay > 0 ? (
            <div className="flex min-w-28 flex-col rounded-lg bg-emerald-100/70 px-3 py-1.5 dark:bg-emerald-900/30">
              <span className="text-xs text-emerald-700 dark:text-emerald-300">Vuelto</span>
              <span className="font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                {formatMoney(overpay)}
              </span>
            </div>
          ) : null}
          <div
            className={`flex min-w-28 flex-col rounded-lg px-3 py-1.5 ${paymentStatusBoxTone}`}
          >
            <span className="text-xs opacity-80">Estado del pago</span>
            <span className="font-semibold">{paymentStatusLabel}</span>
          </div>
        </div>

        <div className="hidden shrink-0 lg:block">
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={!canConfirm || confirmLoading}
            loading={confirmLoading}
            onClick={() => void handleConfirm()}
            data-test-id="pos-payment-confirm-desktop"
          >
            Confirmar pago
          </Button>
        </div>
      </header>

      {pageAlert ? (
        <Alert variant="error">
          <strong className="block font-semibold">No se puede confirmar</strong>
          <span className="mt-1 block text-sm">{pageAlert}</span>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* Columna 1 — Carrito */}
        <section
          className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm"
          style={{ height: `${POS_PAYMENT_PANEL_HEIGHT_VH}vh` }}
          aria-label="Resumen de carrito"
          data-test-id="pos-payment-cart-summary"
        >
          <h2 className="shrink-0 text-sm font-semibold text-foreground">Resumen del carrito</h2>
          <ul
            className="min-h-0 flex-1 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/15 pr-1"
            data-test-id="pos-payment-cart-lines-readonly"
          >
            {cart.lines.map((line) => (
              <PaymentCartReadOnlyRow key={line.variantId} line={line} />
            ))}
          </ul>
          <footer className="shrink-0 space-y-2 border-t border-border pt-3 text-sm">
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
          </footer>
        </section>

        {/* Columna 2 — Cliente */}
        <section
          className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm"
          style={{ height: `${POS_PAYMENT_PANEL_HEIGHT_VH}vh` }}
          aria-label="Información del cliente"
          data-test-id="pos-payment-customer"
        >
          <h2 className="shrink-0 text-sm font-semibold text-foreground">Cliente</h2>
          <div className="shrink-0">
            <TextField
              label="Buscar cliente"
              name="pos-payment-customer-search"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Nombre, RUT o teléfono…"
              alwaysShowLabel
              startAdornment={<Search className="h-4 w-4 shrink-0 text-secondary" strokeWidth={2} aria-hidden />}
              data-test-id="pos-payment-customer-search"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Búsqueda en tu empresa (mínimo 2 caracteres). También puedes crear datos de invitado abajo.
            </p>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto pr-1"
            data-test-id="pos-payment-customer-content"
          >
            {customerSearchLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <DotProgress />
                <span>Buscando…</span>
              </div>
            ) : null}
            {customerSearchError ? (
              <Alert variant="error" className="mb-2 py-2 text-sm">
                {customerSearchError}
              </Alert>
            ) : null}
            {!customerSearchLoading && customerSearch.trim().length >= 2 && customerSearchResults.length > 0 ? (
              <ul className="mb-3 space-y-1 rounded-lg border border-border bg-muted/20 p-1">
                {customerSearchResults.map((row) => (
                  <li key={row.customerId}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-sm transition hover:bg-muted/80"
                      onClick={() => pickSearchCustomer(row)}
                      data-test-id={`pos-payment-customer-pick-${row.customerId}`}
                    >
                      <span className="font-medium text-foreground">{row.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {[row.documentNumber, row.phone].filter(Boolean).join(" · ") || "Sin documento / teléfono"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {!customerSearchLoading &&
            customerSearch.trim().length >= 2 &&
            customerSearchResults.length === 0 &&
            !customerSearchError ? (
              <p className="mb-3 text-sm text-muted-foreground">Sin coincidencias. Prueba otro término o crea un cliente manual.</p>
            ) : null}
            {customer ? (
              <dl className="grid gap-2 text-sm">
                {customer.customerId ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Origen</dt>
                    <dd className="text-foreground">Cliente registrado</dd>
                  </div>
                ) : (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Origen</dt>
                    <dd className="text-foreground">Datos para comprobante (invitado)</dd>
                  </div>
                )}
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
              <p className="text-sm text-muted-foreground">
                Sin cliente asociado. Puedes continuar o registrar datos para el comprobante.
              </p>
            )}
          </div>
          <footer className="shrink-0 flex flex-wrap gap-2 border-t border-border pt-3">
            <Button type="button" variant="outlined" size="sm" onClick={openCustomerDialog}>
              {customer ? "Cambiar cliente" : "Seleccionar o crear cliente"}
            </Button>
            {customer ? (
              <Button type="button" variant="outlined" size="sm" onClick={clearSaleCustomer}>
                Quitar cliente
              </Button>
            ) : null}
          </footer>
        </section>

        {/* Columna 3 — Métodos de pago */}
        <section
          className="flex min-h-0 w-full min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm"
          style={{ height: `${POS_PAYMENT_PANEL_HEIGHT_VH}vh` }}
          data-test-id="pos-payment-methods"
        >
          <div className="flex shrink-0 items-center gap-2">
            <IconButton
              icon="Plus"
              variant="basicSecondary"
              size="md"
              ariaLabel="Agregar método de pago"
              title="Agregar método de pago"
              onClick={openAddPayment}
              disabled={remaining <= 0.01}
              data-test-id="pos-payment-add-method"
            />
            <h2 className="text-sm font-semibold text-foreground">Métodos de pago</h2>
          </div>

          {effectiveError ? (
            <Alert variant="warning" className="text-xs">
              {effectiveError} (usando catálogo por defecto)
            </Alert>
          ) : null}
          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {payments.map((p, index) => {
              const cfg = p.companyPaymentMethodId
                ? methodsById.get(p.companyPaymentMethodId)
                : null;
              const fallbackLabel =
                FALLBACK_PAYMENT_OPTIONS.find((o) => o.id === p.type)?.label ?? p.type;
              const label = cfg?.label ?? fallbackLabel;
              const amountValue = String(Math.max(0, Math.round(p.amount)));
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                  data-test-id={`pos-payment-method-row-${p.id}`}
                >
                  <div className="grid grid-cols-[25%_1fr_auto] items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground" title={label}>
                      {label}
                    </p>
                    <TextField
                      type="currency"
                      label="Monto"
                      name={`pos-payment-line-${index}`}
                      value={amountValue}
                      onChange={(e) => updatePaymentLineAmount(p.id, e.target.value)}
                      currencySymbol="$"
                      alwaysShowLabel
                      data-test-id={
                        index === 0 ? "pos-payment-default-cash-amount" : `pos-payment-line-amount-${p.id}`
                      }
                    />
                    <IconButton
                      icon="X"
                      variant="basicSecondary"
                      size="sm"
                      ariaLabel="Quitar método"
                      onClick={() => removePayment(p.id)}
                    />
                  </div>
                  {showsRefField(p) ? (
                    <div className="mt-2">
                      <TextField
                        label="Referencia"
                        name={`pos-payment-ref-${p.id}`}
                        value={p.reference}
                        onChange={(e) => updatePaymentLineReference(p.id, e.target.value)}
                        placeholder="Opcional"
                        alwaysShowLabel
                        density="compact"
                      />
                    </div>
                  ) : null}
                  {p.type === "CHECK" ? (
                    <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-dashed border-zinc-300 p-2 dark:border-zinc-700 sm:grid-cols-2">
                      <TextField
                        label="N° de cheque"
                        name={`pos-payment-check-number-${p.id}`}
                        value={p.checkData?.checkNumber ?? ""}
                        onChange={(e) =>
                          updatePaymentLineCheckField(p.id, "checkNumber", e.target.value)
                        }
                        alwaysShowLabel
                        density="compact"
                        required
                        data-test-id={`pos-payment-check-number-${p.id}`}
                      />
                      <TextField
                        label="Banco emisor"
                        name={`pos-payment-check-bank-${p.id}`}
                        value={p.checkData?.bankName ?? ""}
                        onChange={(e) =>
                          updatePaymentLineCheckField(p.id, "bankName", e.target.value)
                        }
                        alwaysShowLabel
                        density="compact"
                        required
                        data-test-id={`pos-payment-check-bank-${p.id}`}
                      />
                      <TextField
                        label="Girador"
                        name={`pos-payment-check-drawer-${p.id}`}
                        value={p.checkData?.drawerName ?? ""}
                        onChange={(e) =>
                          updatePaymentLineCheckField(p.id, "drawerName", e.target.value)
                        }
                        alwaysShowLabel
                        density="compact"
                        placeholder="Nombre del firmante"
                        data-test-id={`pos-payment-check-drawer-${p.id}`}
                      />
                      <TextField
                        label="RUT girador"
                        name={`pos-payment-check-drawer-doc-${p.id}`}
                        value={p.checkData?.drawerDocument ?? ""}
                        onChange={(e) =>
                          updatePaymentLineCheckField(
                            p.id,
                            "drawerDocument",
                            e.target.value,
                          )
                        }
                        alwaysShowLabel
                        density="compact"
                        placeholder="Opcional"
                        data-test-id={`pos-payment-check-drawer-doc-${p.id}`}
                      />
                      <TextField
                        label="A fecha"
                        name={`pos-payment-check-due-${p.id}`}
                        value={p.checkData?.dueDate ?? ""}
                        onChange={(e) =>
                          updatePaymentLineCheckField(p.id, "dueDate", e.target.value)
                        }
                        alwaysShowLabel
                        density="compact"
                        placeholder="YYYY-MM-DD (opcional)"
                        data-test-id={`pos-payment-check-due-${p.id}`}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
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
            value={draftOptionId}
            onChange={(id) => setDraftOptionId(id != null ? String(id) : "")}
            options={paymentTypeOptions}
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
            label="Referencia"
            name="payment-ref"
            value={draftReference}
            onChange={(e) => setDraftReference(e.target.value)}
            placeholder="Opcional"
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
