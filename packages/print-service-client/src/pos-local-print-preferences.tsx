"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  PrintServiceConnection,
  buildWebSocketUrl,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  readPosPurposePrinterAliasesFromStorage,
  writePosPurposePrinterAliasesToStorage,
  writePrintServiceConfigToStorage,
} from "./core";

type Props = {
  className?: string;
};

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

export function PosLocalPrintPreferencesForm({ className = "" }: Props) {
  const formId = useId();
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("14567");
  const [wssPort, setWssPort] = useState("14568");
  const [useTls, setUseTls] = useState(false);
  const [token, setToken] = useState("");
  const [ticketsAlias, setTicketsAlias] = useState("");
  const [documentsAlias, setDocumentsAlias] = useState("");
  const [ticketAliases, setTicketAliases] = useState<string[]>([]);
  const [documentAliases, setDocumentAliases] = useState<string[]>([]);
  const [aliasesLoading, setAliasesLoading] = useState(false);

  useEffect(() => {
    const c = readPrintServiceConfigFromStorage();
    setHost(c.host);
    setPort(String(c.port));
    setWssPort(String(c.wssPort));
    setUseTls(c.useTls);
    setToken(c.token);
    const a = readPosPurposePrinterAliasesFromStorage();
    setTicketsAlias(a.ticketsAlias);
    setDocumentsAlias(a.documentsAlias);
  }, []);

  const url = useMemo(() => {
    const tls = printServicePageRequiresTls() || useTls;
    const p = Number(tls ? wssPort : port) || (tls ? 14568 : 14567);
    return buildWebSocketUrl(host, p, tls);
  }, [host, port, wssPort, useTls]);

  const connOpts = useMemo(
    () => ({
      url,
      token: token || undefined,
      clientId: "pwa-pos-print-prefs",
      appLabel: "Punto de venta",
      userDisplayName: "Impresión",
    }),
    [token, url],
  );

  const refreshAliasesFromAgent = useCallback(async () => {
    setAliasesLoading(true);
    const c = new PrintServiceConnection({ ...connOpts });
    let reachedOpen = false;
    c.connect();
    try {
      await c.waitForOpen(20_000);
      reachedOpen = true;
      await new Promise((r) => globalThis.setTimeout(r, 400));
      const raw = (await c.getConfig()) as {
        aliasesByPurpose?: Record<string, unknown>;
      };
      const abp = raw?.aliasesByPurpose ?? {};
      setTicketAliases(stringList(abp.tickets));
      setDocumentAliases(stringList(abp.documents));
    } catch {
      setTicketAliases([]);
      setDocumentAliases([]);
    } finally {
      c.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
      setAliasesLoading(false);
    }
  }, [connOpts]);

  useEffect(() => {
    void refreshAliasesFromAgent();
  }, [refreshAliasesFromAgent]);

  const saveAll = useCallback(() => {
    writePrintServiceConfigToStorage({
      host,
      port: Number(port) || 14567,
      wssPort: Number(wssPort) || 14568,
      useTls,
      token,
    });
    writePosPurposePrinterAliasesToStorage({
      ticketsAlias,
      documentsAlias,
    });
  }, [host, port, wssPort, useTls, token, ticketsAlias, documentsAlias]);

  return (
    <>
      <form
        id={formId}
        className={`space-y-6 ${className}`}
        onSubmit={(e) => {
          e.preventDefault();
          saveAll();
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
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted-foreground">Token (opcional)</span>
            <input
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="rounded-md border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Impresoras por tipo</h2>
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-sm"
              disabled={aliasesLoading}
              onClick={() => void refreshAliasesFromAgent()}
            >
              {aliasesLoading ? "Cargando…" : "Actualizar desde el agente"}
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">Tickets</span>
              <select
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                value={ticketsAlias}
                onChange={(e) => setTicketsAlias(e.target.value)}
              >
                <option value="">Ninguna</option>
                {ticketsAlias && !ticketAliases.includes(ticketsAlias) ? (
                  <option value={ticketsAlias}>{ticketsAlias}</option>
                ) : null}
                {ticketAliases.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Documentos</span>
              <select
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                value={documentsAlias}
                onChange={(e) => setDocumentsAlias(e.target.value)}
              >
                <option value="">Ninguna</option>
                {documentsAlias && !documentAliases.includes(documentsAlias) ? (
                  <option value={documentsAlias}>{documentsAlias}</option>
                ) : null}
                {documentAliases.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </form>

      <div className="mt-10 flex w-full justify-end pb-16">
        <button
          type="submit"
          form={formId}
          className="rounded border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Guardar configuración
        </button>
      </div>
    </>
  );
}
