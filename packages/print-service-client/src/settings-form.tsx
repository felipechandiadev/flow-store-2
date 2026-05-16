"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  PrintServiceConnection,
  buildWebSocketUrl,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  writePrintServiceConfigToStorage,
} from "./core";

type Props = {
  className?: string;
};

type MappingLine = {
  id: string;
  purpose: string;
  systemPrinterName: string;
  sortOrder: number;
  displayLabel?: string;
};

function newLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `l-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PURPOSES = ["documents", "tickets", "labels", "reports"] as const;

export function LocalPrintingSettingsForm({ className = "" }: Props) {
  const formId = useId();
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("14567");
  const [wssPort, setWssPort] = useState("14568");
  const [useTls, setUseTls] = useState(false);
  const [token, setToken] = useState("");
  /** Lista local de impresoras (antes rellenable con «Listar impresoras»; se mantiene vacía en la UI reducida). */
  const printers: { name: string }[] = [];
  const [mappingLines, setMappingLines] = useState<MappingLine[]>([]);

  useEffect(() => {
    const c = readPrintServiceConfigFromStorage();
    setHost(c.host);
    setPort(String(c.port));
    setWssPort(String(c.wssPort));
    setUseTls(c.useTls);
    setToken(c.token);
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
      clientId: "settings-ui",
      appLabel: "Ajustes de impresión",
      userDisplayName: "Operador",
    }),
    [token, url],
  );

  const loadMappingFromAgent = useCallback(async () => {
    const c = new PrintServiceConnection({
      ...connOpts,
    });
    let reachedOpen = false;
    c.connect();
    try {
      await c.waitForOpen(20_000);
      reachedOpen = true;
      await new Promise((r) => globalThis.setTimeout(r, 400));
      const raw = (await c.getConfig()) as {
        mappingLines?: Array<{
          id?: string;
          purpose?: string;
          systemPrinterName?: string;
          sortOrder?: number;
          displayLabel?: string | null;
        }>;
      };
      const rows = raw?.mappingLines ?? [];
      setMappingLines(
        rows.map((r, idx) => ({
          id: String(r.id ?? newLineId()),
          purpose: String(r.purpose ?? "documents"),
          systemPrinterName: String(r.systemPrinterName ?? ""),
          sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : idx,
          displayLabel: r.displayLabel ?? undefined,
        })),
      );
    } catch {
      /* sin consola UI; fallos pueden verse en herramientas de red si hace falta */
    } finally {
      c.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
    }
  }, [connOpts]);

  const saveMappingLines = useCallback(async () => {
    const payload = mappingLines
      .filter((l) => l.systemPrinterName.trim().length > 0)
      .map((l, idx) => ({
        id: l.id,
        purpose: l.purpose,
        systemPrinterName: l.systemPrinterName.trim(),
        sortOrder: idx,
        displayLabel: l.displayLabel?.trim() || null,
      }));
    const c = new PrintServiceConnection({ ...connOpts });
    let reachedOpen = false;
    c.connect();
    try {
      await c.waitForOpen(20_000);
      reachedOpen = true;
      await new Promise((r) => globalThis.setTimeout(r, 400));
      await c.setMappingLines(payload);
    } catch {
      /* ignorado en esta UI minimalista */
    } finally {
      c.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
    }
  }, [connOpts, mappingLines]);

  const saveLocal = useCallback(() => {
    writePrintServiceConfigToStorage({
      host,
      port: Number(port) || 14567,
      wssPort: Number(wssPort) || 14568,
      useTls,
      token,
    });
  }, [host, port, token, useTls, wssPort]);

  const runTestPrint = useCallback(
    async (purpose: string) => {
      const c = new PrintServiceConnection({ ...connOpts });
      let reachedOpen = false;
      c.connect();
      try {
        await c.waitForOpen(20_000);
        reachedOpen = true;
        await new Promise((r) => globalThis.setTimeout(r, 400));
        await c.requestTestPrint(purpose);
      } catch {
        /* sin log en pantalla */
      } finally {
        c.disconnect({ ifConnecting: reachedOpen ? "default" : "abandon" });
      }
    },
    [connOpts],
  );

  function addLine() {
    setMappingLines((prev) => [
      ...prev,
      {
        id: newLineId(),
        purpose: "documents",
        systemPrinterName: "",
        sortOrder: prev.length,
      },
    ]);
  }

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
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted-foreground">Token (opcional, debe coincidir con el agente)</span>
          <input
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="rounded-md border border-border p-4">
        <h2 className="text-sm font-semibold">Mapeo por líneas (failover)</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => void loadMappingFromAgent()}>
            Cargar desde el agente
          </button>
          <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={addLine}>
            Agregar línea
          </button>
          <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => void saveMappingLines()}>
            Guardar líneas en el agente
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {mappingLines.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin líneas. Agregá una o cargá desde el agente.</p>
          ) : (
            mappingLines.map((line) => (
              <div key={line.id} className="rounded border border-border p-3">
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => setMappingLines((rows) => rows.filter((r) => r.id !== line.id))}
                  >
                    Quitar
                  </button>
                </div>
                <label className="mb-2 block text-xs">
                  <span className="text-muted-foreground">Propósito</span>
                  <select
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    value={line.purpose}
                    onChange={(e) =>
                      setMappingLines((rows) =>
                        rows.map((r) => (r.id === line.id ? { ...r, purpose: e.target.value } : r)),
                      )
                    }
                  >
                    {PURPOSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mb-2 block text-xs">
                  <span className="text-muted-foreground">Impresora del sistema</span>
                  <select
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    value={line.systemPrinterName}
                    onChange={(e) =>
                      setMappingLines((rows) =>
                        rows.map((r) => (r.id === line.id ? { ...r, systemPrinterName: e.target.value } : r)),
                      )
                    }
                  >
                    <option value="">— Elegí —</option>
                    {printers.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    {line.systemPrinterName && !printers.some((p) => p.name === line.systemPrinterName) ? (
                      <option value={line.systemPrinterName}>{line.systemPrinterName} (no listada)</option>
                    ) : null}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">Alias (opcional)</span>
                  <input
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    value={line.displayLabel ?? ""}
                    onChange={(e) =>
                      setMappingLines((rows) =>
                        rows.map((r) => (r.id === line.id ? { ...r, displayLabel: e.target.value } : r)),
                      )
                    }
                  />
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-md border border-border p-4">
        <h2 className="text-sm font-semibold">Pruebas de impresión</h2>
        <p className="mt-1 text-xs text-muted-foreground">Usa el PDF mínimo del agente (no requiere archivo desde el navegador).</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => void runTestPrint("tickets")}>
            Ticket de prueba
          </button>
          <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => void runTestPrint("documents")}>
            Documento de prueba
          </button>
        </div>
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
