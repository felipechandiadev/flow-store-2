"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Alert,
  Button,
  DotProgress,
  IconButton,
  Select,
  TextField,
} from "@/shared/admin-shared";
import type { Option } from "@/shared/components/Select/Select";
import { readPosContextClient, patchPosContextClient } from "@/features/session/lib/pos-context-storage";
import { listCashHubsForDepositAction } from "@/features/session/actions/cash-hub-deposit.action";
import { closeCashSessionAction } from "@/features/session/actions/close-cash-session.action";
import { getEffectivePosPaymentMethodsAction } from "@/features/pos-payment-methods/actions/payment-methods-pos.action";
import type { EffectivePaymentMethod } from "@/features/pos-payment-methods/types/effective-payment-method.types";
import type { CashHubDepositCandidate } from "@/features/session/types/cash-hub-deposit.types";
import type { PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";
import {
  addAmountToCloseCounted,
  emptyCloseCounted,
  grandCloseCounted,
} from "@/features/session/lib/close-counted-buckets";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";

/** Si el POS no devuelve catálogo, permitimos arqueo con los medios estándar. */
function fallbackCloseMethods(): EffectivePaymentMethod[] {
  const rows: Array<{ method: PosPaymentMethodId; label: string; order: number }> = [
    { method: "CASH", label: "Efectivo", order: 0 },
    { method: "DEBIT_CARD", label: "Tarjeta débito", order: 1 },
    { method: "CREDIT_CARD", label: "Tarjeta crédito", order: 2 },
    { method: "TRANSFER", label: "Transferencia", order: 3 },
    { method: "CHECK", label: "Cheque", order: 4 },
  ];
  return rows.map((r) => ({
    companyPaymentMethodId: `__close_fallback__:${r.method}`,
    method: r.method,
    label: r.label,
    alias: null,
    bankAccountKey: null,
    requireReference: false,
    preloadOnPaymentScreen: false,
    preloadOrder: null,
    isDefaultForChange: r.method === "CASH",
    displayOrder: r.order,
  }));
}

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** Monto en pesos CLP (enteros) desde `TextField` tipo currency (sólo dígitos). */
function parseAmountCLPInput(raw: string): number {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

type CloseOk = Extract<Awaited<ReturnType<typeof closeCashSessionAction>>, { success: true }>;

export default function CashClosingPageClient() {
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();
  const cart = usePosCart();
  const signOutStartedRef = useRef(false);

  const [cashSessionId, setCashSessionId] = useState<string | null>(null);
  const [pointOfSaleId, setPointOfSaleId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const [effectiveMethods, setEffectiveMethods] = useState<EffectivePaymentMethod[]>([]);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);
  const [effectiveLoaded, setEffectiveLoaded] = useState(false);

  const [hubs, setHubs] = useState<CashHubDepositCandidate[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(false);
  const [hubId, setHubId] = useState<string | null>(null);

  const [amountsByMethodId, setAmountsByMethodId] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [step, setStep] = useState<"blind" | "result">("blind");
  const [closeResult, setCloseResult] = useState<CloseOk | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const [isPending, startTransition] = useTransition();

  const finishUserSession = useCallback(() => {
    if (signOutStartedRef.current) return;
    signOutStartedRef.current = true;
    setSigningOut(true);
    void signOut({ callbackUrl: "/" });
  }, []);

  useEffect(() => {
    if (step !== "result" || !closeResult) return;
    finishUserSession();
  }, [step, closeResult, finishUserSession]);

  useEffect(() => {
    const ctx = readPosContextClient();
    const sid = typeof ctx?.cashSessionId === "string" ? ctx.cashSessionId.trim() : "";
    const pid = typeof ctx?.pointOfSaleId === "string" ? ctx.pointOfSaleId.trim() : "";
    setCashSessionId(sid || null);
    setPointOfSaleId(pid || null);
    setLoadingCtx(false);
    if (!sid) {
      setLoadError("No hay sesión de caja activa. Abre caja desde la pantalla inicial del POS.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setEffectiveLoaded(false);
      if (!pointOfSaleId) {
        if (!cancelled) {
          setEffectiveMethods([]);
          setEffectiveError(loadingCtx ? null : "Sin punto de venta en el contexto.");
        }
        if (!cancelled) setEffectiveLoaded(true);
        return;
      }
      const res = await getEffectivePosPaymentMethodsAction({ pointOfSaleId });
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
  }, [pointOfSaleId, loadingCtx]);

  const inputMethods = useMemo(() => {
    if (effectiveMethods.length > 0) return effectiveMethods;
    if (effectiveLoaded && pointOfSaleId && !effectiveError) return fallbackCloseMethods();
    return [];
  }, [effectiveLoaded, effectiveError, effectiveMethods, pointOfSaleId]);

  useEffect(() => {
    setAmountsByMethodId((prev) => {
      const next = { ...prev };
      for (const m of inputMethods) {
        const id = m.companyPaymentMethodId;
        if (!(id in next)) next[id] = "";
      }
      return next;
    });
  }, [inputMethods]);

  const loadHubs = useCallback(async (sessionId: string) => {
    setLoadingHubs(true);
    const res = await listCashHubsForDepositAction(sessionId);
    setLoadingHubs(false);
    if (!res.success) {
      setHubs([]);
      return;
    }
    setHubs(res.hubs);
    if (res.hubs.length === 1) {
      setHubId(res.hubs[0].id);
    }
  }, []);

  useEffect(() => {
    if (!cashSessionId) return;
    void loadHubs(cashSessionId);
  }, [cashSessionId, loadHubs]);

  const hubOptions: Option[] = useMemo(
    () =>
      hubs.map((h) => ({
        id: h.id,
        label: `${h.name} · ${currencyFmt.format(h.currentBalance)}`,
      })),
    [hubs],
  );

  const selectedHub = useMemo(
    () => (hubId ? hubs.find((h) => h.id === hubId) ?? null : null),
    [hubId, hubs],
  );

  const countedPayload = useMemo(() => {
    const acc = emptyCloseCounted();
    for (const m of inputMethods) {
      const raw = amountsByMethodId[m.companyPaymentMethodId] ?? "";
      addAmountToCloseCounted(acc, String(m.method), parseAmountCLPInput(raw));
    }
    return acc;
  }, [amountsByMethodId, inputMethods]);

  const countedGrand = useMemo(() => grandCloseCounted(countedPayload), [countedPayload]);

  const userId = authSession?.user?.id?.trim() ?? "";

  const canSubmitBlind = Boolean(
    cashSessionId &&
      userId &&
      authStatus === "authenticated" &&
      !isPending &&
      step === "blind" &&
      inputMethods.length > 0,
  );

  const onSubmitBlind = () => {
    setFormError(null);
    if (!cashSessionId) {
      setFormError("No hay sesión de caja activa.");
      return;
    }
    if (!userId) {
      setFormError("No se pudo determinar el usuario de la sesión. Vuelve a iniciar sesión.");
      return;
    }
    if (countedGrand < 1) {
      setFormError(
        "Ingresa los montos contados por cada medio habilitado. La suma debe ser mayor a cero para realizar el arqueo ciego; si necesitas cerrar sin conteo, contacta soporte o usa el flujo estándar desde administración.",
      );
      return;
    }

    startTransition(async () => {
      const res = await closeCashSessionAction({
        cashSessionId,
        userId,
        notes: notes.trim() || undefined,
        cashHubId: hubId?.trim() || undefined,
        counted: countedPayload,
      });
      if (!res.success) {
        setFormError(res.message);
        return;
      }
      patchPosContextClient({ cashSessionId: null });
      cart.clear();
      setCloseResult(res);
      setStep("result");
    });
  };

  if (loadingCtx) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <DotProgress />
        Cargando contexto…
      </div>
    );
  }

  if (step === "result" && closeResult) {
    const blind = Boolean(closeResult.usedBlindCount);
    const diff = typeof closeResult.difference === "number" ? closeResult.difference : null;
    const counted = closeResult.counted as Record<string, number> | undefined;

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Cierre de caja</h1>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground sm:text-sm">
              {blind
                ? "Resultado del arqueo: comparación entre efectivo contado y el saldo teórico de la sesión."
                : "La sesión de caja se cerró correctamente."}
            </p>
          </div>
        </div>

        <Alert variant="success" className="text-sm">
          {closeResult.message ?? "Sesión de caja cerrada correctamente."}
        </Alert>

        <Alert variant="info" className="text-sm">
          {signingOut
            ? "Cerrando sesión de usuario… Serás redirigido al inicio de sesión."
            : "La sesión de usuario se cerrará automáticamente."}
        </Alert>

        {blind && counted ? (
          <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Cuadre (cierre ciego)</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Total declarado (todos los medios)</dt>
                <dd className="tabular-nums text-base font-semibold">
                  {currencyFmt.format(Math.round(Number(closeResult.countedGrand ?? countedGrand)))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Efectivo teórico en sesión</dt>
                <dd className="tabular-nums text-base font-semibold">
                  {currencyFmt.format(Math.round(Number(closeResult.systemCashExpected ?? 0)))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Efectivo contado</dt>
                <dd className="tabular-nums text-base font-semibold">
                  {currencyFmt.format(Math.round(Number(counted.cash ?? 0)))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Diferencia (total declarado − efectivo teórico)</dt>
                <dd
                  className={`tabular-nums text-base font-semibold ${
                    diff != null && Math.abs(diff) > 0.01 ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                  }`}
                >
                  {diff != null ? currencyFmt.format(Math.round(diff)) : "—"}
                </dd>
              </div>
            </dl>
            {typeof closeResult.salesTotal === "number" ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Total de ventas de referencia en sesión:{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {currencyFmt.format(Math.round(closeResult.salesTotal))}
                </span>
                .
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" onClick={finishUserSession} disabled={signingOut}>
            {signingOut ? "Cerrando sesión…" : "Cerrar sesión de usuario"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Cierre de caja (arqueo ciego)</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Declara los montos físicos por cada medio de pago habilitado en este POS. No se muestran totales del
            sistema hasta después del cierre. La suma de todos los medios debe coincidir con lo que entregas en caja;
            el sistema contrasta sobre todo el efectivo contado vs. el efectivo teórico de la sesión.
          </p>
        </div>
        <IconButton
          icon="ArrowLeft"
          variant="basic"
          size="md"
          ariaLabel="Volver al POS"
          title="Volver al POS"
          onClick={() => router.push("/pos")}
        />
      </div>

      {loadError ? (
        <Alert variant="warning" className="text-sm">
          {loadError}
        </Alert>
      ) : null}

      {effectiveError ? (
        <Alert variant="warning" className="text-sm">
          No se pudieron cargar los medios de pago del POS: {effectiveError}
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" className="text-sm">
          {formError}
        </Alert>
      ) : null}

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Conteo por medio</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Completa cada campo con el monto contado (pesos chilenos, sin decimales). Tarjetas, transferencias y cheques
          van en su casilla aunque no haya efectivo físico de ese tipo.
        </p>

        {!effectiveLoaded ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <DotProgress /> Cargando medios de pago…
          </div>
        ) : inputMethods.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {loadError
              ? "Sin medios de pago para mostrar."
              : "No hay medios configurados. Revisa el punto de venta o vuelve a abrir sesión."}
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {inputMethods.map((m) => {
              const id = m.companyPaymentMethodId;
              const val = amountsByMethodId[id] ?? "";
              return (
                <li key={id}>
                  <TextField
                    type="currency"
                    label={m.label}
                    name={`close-count-${id}`}
                    value={val}
                    onChange={(e) =>
                      setAmountsByMethodId((prev) => ({
                        ...prev,
                        [id]: e.target.value,
                      }))
                    }
                    alwaysShowLabel
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Suma ingresada:{" "}
            <span className="font-semibold tabular-nums text-foreground">{currencyFmt.format(countedGrand)}</span>
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Centro de acopio (opcional)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          El efectivo contado puede trasladarse al hub por defecto del POS o al que elijas aquí.
        </p>
        <div className="mt-4 max-w-md">
          {loadingHubs ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <DotProgress /> Cargando centros…
            </div>
          ) : hubs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay centros disponibles; se usará el default del POS.</p>
          ) : (
            <Select
              label="Centro de acopio"
              placeholder="Selecciona…"
              options={hubOptions}
              value={hubId}
              onChange={(id) => setHubId(id != null ? String(id) : null)}
            />
          )}
        </div>
        {selectedHub ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Saldo hub: <span className="tabular-nums">{currencyFmt.format(selectedHub.currentBalance)}</span>
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
        <TextField
          label="Notas (opcional)"
          name="close-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          alwaysShowLabel
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" disabled={!canSubmitBlind} onClick={onSubmitBlind}>
          {isPending ? "Procesando…" : "Cerrar sesión y cuadrar"}
        </Button>
      </div>
    </div>
  );
}
