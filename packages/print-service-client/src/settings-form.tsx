"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  readPrintServiceConfigFromStorage,
  writePrintServiceConfigToStorage,
} from "./core";

type Props = {
  className?: string;
};

/**
 * Formulario mínimo de conexión al agente (host, puertos).
 * Las PWAs (admin, POS) deben usar sus propios formularios con el design system;
 * el mapeo failover y las pruebas de impresión se configuran en el agente Tauri.
 */
export function LocalPrintingSettingsForm({ className = "" }: Props) {
  const formId = useId();
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("14567");
  const [wssPort, setWssPort] = useState("14568");
  const [useTls, setUseTls] = useState(false);

  useEffect(() => {
    const c = readPrintServiceConfigFromStorage();
    setHost(c.host);
    setPort(String(c.port));
    setWssPort(String(c.wssPort));
    setUseTls(c.useTls);
  }, []);

  const saveLocal = useCallback(() => {
    writePrintServiceConfigToStorage({
      host,
      port: Number(port) || 14567,
      wssPort: Number(wssPort) || 14568,
      useTls,
    });
  }, [host, port, useTls, wssPort]);

  return (
    <>
      <form
        id={formId}
        className={`space-y-6 ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          saveLocal();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Host</span>
            <input
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Puerto WS (sin TLS)</span>
            <input
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Puerto WSS</span>
            <input
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              value={wssPort}
              onChange={(e) => setWssPort(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} />
            Usar WSS (HTTPS / certificado local)
          </label>
        </div>
      </form>
      <div className="mt-10 flex w-full justify-end pb-16">
        <button
          type="submit"
          form={formId}
          className="rounded bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95"
        >
          Guardar configuración
        </button>
      </div>
    </>
  );
}
