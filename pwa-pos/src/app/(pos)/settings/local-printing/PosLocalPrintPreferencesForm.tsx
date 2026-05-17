"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  PrintServiceConnection,
  buildWebSocketUrl,
  printServicePageRequiresTls,
  readPrintServiceConfigFromStorage,
  readPosDocumentPrintModesFromStorage,
  readPosPurposePrinterAliasesFromStorage,
  type PosDocumentPrintKind,
  type PosDocumentPrintMode,
  writePosDocumentPrintModesToStorage,
  writePosPurposePrinterAliasesToStorage,
  writePrintServiceConfigToStorage,
} from "@flowstore/print-service-client";
import { Button, Select, Switch, TextField } from "@/shared/admin-shared";
import { DocumentPrintModeToggle } from "@/features/pos-print/ui/DocumentPrintModeToggle";

type Props = {
  className?: string;
};

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

const INITIAL_DOC_PRINT_MODES: Record<PosDocumentPrintKind, PosDocumentPrintMode> = {
  sale: "ticket",
  quotation: "ticket",
  backorder: "ticket",
  customerCreditNote: "ticket",
};

function aliasSelectOptions(aliases: string[], current: string) {
  const ids = new Set<string>();
  const options: { id: string; label: string }[] = [{ id: "", label: "Ninguna" }];
  if (current && !aliases.includes(current)) {
    options.push({ id: current, label: current });
    ids.add(current);
  }
  for (const a of aliases) {
    if (ids.has(a)) continue;
    ids.add(a);
    options.push({ id: a, label: a });
  }
  return options;
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
  const [docPrintModes, setDocPrintModes] =
    useState<Record<PosDocumentPrintKind, PosDocumentPrintMode>>(INITIAL_DOC_PRINT_MODES);
  const [storageHydrated, setStorageHydrated] = useState(false);

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
    setDocPrintModes(readPosDocumentPrintModesFromStorage());
    setStorageHydrated(true);
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
      appLabel: "KaiStore POS",
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
    writePosDocumentPrintModesToStorage(docPrintModes);
  }, [host, port, wssPort, useTls, token, ticketsAlias, documentsAlias, docPrintModes]);

  const setDocMode = useCallback((kind: PosDocumentPrintKind, mode: PosDocumentPrintMode) => {
    setDocPrintModes((prev) => ({ ...prev, [kind]: mode }));
  }, []);

  const ticketOptions = useMemo(
    () => aliasSelectOptions(ticketAliases, ticketsAlias),
    [ticketAliases, ticketsAlias],
  );
  const documentOptions = useMemo(
    () => aliasSelectOptions(documentAliases, documentsAlias),
    [documentAliases, documentsAlias],
  );

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
        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Conexión al agente</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField
              label="Host"
              name="print-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              alwaysShowLabel
              data-test-id="pos-print-prefs-host"
            />
            <TextField
              label="Puerto WS (sin TLS)"
              name="print-port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              alwaysShowLabel
              data-test-id="pos-print-prefs-port"
            />
            <TextField
              label="Puerto WSS"
              name="print-wss-port"
              value={wssPort}
              onChange={(e) => setWssPort(e.target.value)}
              alwaysShowLabel
              data-test-id="pos-print-prefs-wss-port"
            />
            <div className="flex items-end pb-1 sm:col-span-2">
              <Switch
                checked={useTls}
                onChange={setUseTls}
                label="Usar WSS (HTTPS / certificado local)"
                labelPosition="right"
                data-test-id="pos-print-prefs-use-tls"
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                label="Token (opcional)"
                name="print-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                alwaysShowLabel
                data-test-id="pos-print-prefs-token"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Impresoras por tipo</h2>
            <Button
              type="button"
              variant="outlined"
              size="sm"
              disabled={aliasesLoading}
              loading={aliasesLoading}
              onClick={() => void refreshAliasesFromAgent()}
              data-test-id="pos-print-prefs-refresh-aliases"
            >
              Actualizar desde el agente
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Tickets"
              options={ticketOptions}
              value={ticketsAlias || null}
              onChange={(id) => setTicketsAlias(id == null ? "" : String(id))}
              allowClear
              alwaysShowLabel
              data-test-id="pos-print-prefs-tickets-alias"
            />
            <Select
              label="Documentos"
              options={documentOptions}
              value={documentsAlias || null}
              onChange={(id) => setDocumentsAlias(id == null ? "" : String(id))}
              allowClear
              alwaysShowLabel
              data-test-id="pos-print-prefs-documents-alias"
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">Impresión según documento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Formato por defecto al imprimir desde el POS. En cotizaciones, el diálogo de emisión
            precargará esta opción (puedes cambiarla antes de imprimir).
          </p>
          <div className="mt-4 grid gap-4">
            {(
              [
                ["sale", "Ventas", "pos-print-prefs-sale-mode"] as const,
                ["quotation", "Cotizaciones", "pos-print-prefs-quotation-mode"] as const,
                ["backorder", "Encargos", "pos-print-prefs-backorder-mode"] as const,
                [
                  "customerCreditNote",
                  "Notas de crédito",
                  "pos-print-prefs-customer-credit-note-mode",
                ] as const,
              ] as const
            ).map(([kind, label, testId]) => (
              <div key={kind}>
                <p className="mb-2 text-sm font-medium text-foreground">{label}</p>
                {storageHydrated ? (
                  <DocumentPrintModeToggle
                    value={docPrintModes[kind]}
                    onChange={(mode) => setDocMode(kind, mode)}
                    data-test-id={testId}
                  />
                ) : (
                  <div
                    className="h-[52px] rounded-lg border border-border bg-muted/20"
                    aria-hidden
                    data-test-id={`${testId}-skeleton`}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      </form>

      <div className="mt-8 flex w-full justify-end pb-16">
        <Button type="submit" form={formId} variant="primary" data-test-id="pos-print-prefs-save">
          Guardar configuración
        </Button>
      </div>
    </>
  );
}
