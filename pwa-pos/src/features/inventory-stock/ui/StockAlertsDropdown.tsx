"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import IconButton from "@/shared/components/IconButton/IconButton";
import { useStockRealtime } from "../realtime/stock-realtime-context";
import {
  formatReceivedAt,
  labelStockAlertKind,
  shortVariantId,
} from "../lib/stock-alert-copy";

const PANEL_Z = 200;

export function StockAlertsDropdown() {
  const { stockAlertCount, lastStockEvents, clearStockAlerts } = useStockRealtime();
  const [open, setOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const alertRows = useMemo(
    () => lastStockEvents.filter((e) => Array.isArray(e.alerts) && e.alerts.length > 0),
    [lastStockEvents],
  );

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const el = triggerWrapRef.current;
    if (!el) return;

    const place = () => {
      const r = el.getBoundingClientRect();
      const maxW = Math.min(22 * 16, window.innerWidth - 16);
      const left = Math.max(8, r.right - maxW);
      const top = r.bottom + 4;
      setCoords({ top, left, width: maxW });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (triggerWrapRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const panelStyle = {
    backgroundColor: "var(--color-background)",
    borderColor: "var(--color-border)",
    color: "var(--color-foreground)",
    zIndex: PANEL_Z,
  } as const;

  const panel =
    open && coords ? (
      <div
        ref={panelRef}
        className="fixed flex max-h-[min(24rem,70vh)] flex-col overflow-hidden rounded-md border shadow-lg"
        style={{
          ...panelStyle,
          top: coords.top,
          left: coords.left,
          width: coords.width,
        }}
        role="dialog"
        aria-label="Alertas de stock"
        data-test-id="stock-alerts-popover"
      >
        <div
          className="flex items-center gap-2 border-b px-3 py-2.5"
          style={{ borderColor: "var(--color-border)" }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">Alertas de stock</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {alertRows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm" style={{ color: "var(--color-muted-foreground, #737373)" }}>
              Sin alertas recientes. Aparecerán al cargar la página o cuando el inventario cruce los umbrales (tiempo
              real).
            </p>
          ) : (
            <ul>
              {alertRows.map((evt, idx) => (
                <li
                  key={`${evt.productVariantId}-${evt.storageId}-${(evt as { receivedAt?: number }).receivedAt ?? idx}`}
                  className="border-b px-3 py-2.5 last:border-b-0"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground, #737373)" }}>
                    {formatReceivedAt((evt as { receivedAt?: number }).receivedAt)}
                  </p>
                  <p className="mt-1 text-xs">
                    Variante{" "}
                    <span className="font-mono" style={{ color: "var(--color-foreground)" }}>
                      {shortVariantId(evt.productVariantId)}
                    </span>
                    {" · "}
                    Stock físico{" "}
                    <strong>{Number(evt.physicalStock).toLocaleString("es-CL", { maximumFractionDigits: 3 })}</strong>
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-amber-800 dark:text-amber-200">
                    {evt.alerts!.map((a) => (
                      <li key={a} className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                        <span>{labelStockAlertKind(a)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
        {alertRows.length > 0 ? (
          <div
            className="border-t px-2 py-2"
            style={{ borderColor: "var(--color-border)", backgroundColor: "rgba(0,0,0,0.03)" }}
          >
            <button
              type="button"
              className="w-full rounded-md px-2 py-1.5 text-center text-sm font-medium"
              style={{ color: "var(--color-foreground)" }}
              onClick={() => {
                clearStockAlerts();
                setOpen(false);
              }}
              data-test-id="stock-alerts-clear"
            >
              Marcar como leídas
            </button>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="relative shrink-0" data-test-id="stock-alerts-dropdown-root">
      <div ref={triggerWrapRef} className="relative inline-flex shrink-0">
        <IconButton
          icon="Bell"
          variant="text"
          size="md"
          ariaLabel={`Alertas de stock${stockAlertCount > 0 ? `: ${stockAlertCount} nuevas` : ""}`}
          title="Alertas de stock"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          data-test-id="stock-alerts-trigger"
        />
        {stockAlertCount > 0 ? (
          <span
            className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white"
            style={{ backgroundColor: "var(--color-destructive, #dc2626)" }}
          >
            {stockAlertCount > 99 ? "99+" : stockAlertCount}
          </span>
        ) : null}
      </div>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
