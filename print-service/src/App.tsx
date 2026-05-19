import { useCallback, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ChevronDown } from "lucide-react";
import IconButton from "./shared/components/IconButton/IconButton";
import Switch from "./shared/components/Switch";
import { Select } from "./shared/components/Select";
import SharedTextField from "./shared/components/TextField/TextField";

const APP_NAME = "KaiPrinters";
const DEFAULT_AGENT_DISPLAY_NAME = APP_NAME;
const APP_COPYRIGHT = "Felipe Chandía Castillo © 2026";

function normalizeAgentDisplayName(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  return t || DEFAULT_AGENT_DISPLAY_NAME;
}

const PURPOSES = [
  { id: "tickets", label: "Tickets" },
  { id: "labels", label: "Etiquetas" },
  { id: "reports", label: "Informes" },
] as const;

const DEFAULT_PURPOSE = PURPOSES[0].id;

function normalizeMappingPurpose(purpose: string | undefined): string {
  const p = (purpose?.trim() || DEFAULT_PURPOSE).toLowerCase();
  if (p === "documents") return DEFAULT_PURPOSE;
  return PURPOSES.some(({ id }) => id === p) ? p : DEFAULT_PURPOSE;
}

type PrinterRow = {
  name: string;
  default?: boolean;
  online?: boolean;
};

type MappingRow = { purpose: string; printerName?: string };

type ConnectedSession = {
  connectionId?: string;
  clientId?: string;
  appLabel?: string;
  userDisplayName?: string;
  companyName?: string;
  pointOfSaleName?: string;
  requiredPurposes?: string[];
};

type MappingLineRow = {
  id: string;
  purpose: string;
  systemPrinterName: string;
  sortOrder: number;
  displayLabel?: string;
};

type JobRow = {
  id?: string;
  status: string;
  filename?: string;
  purpose?: string;
  createdAt?: string;
  documentType?: string;
  internalFolio?: string;
  sourceApp?: string;
  requestedBy?: string;
};

type DashboardPayload = {
  listenPort?: number;
  wssListenPort?: number;
  wssEnabled?: boolean;
  wsListening?: boolean;
  wssListening?: boolean;
  agentDisplayName?: string;
  printers?: PrinterRow[];
  mappings?: MappingRow[];
  mappingLines?: MappingLineRow[];
  printerHealth?: {
    overall?: string;
    message?: string;
    purposes?: Record<string, { status?: string; printerName?: string; printerNames?: unknown }>;
  };
  jobs?: JobRow[];
  serviceStatus?: {
    connectedClients?: number;
    sessions?: ConnectedSession[];
  };
  metrics?: { jobsCompletedTotal?: number };
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function newLineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `l-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ConnectedSessionCard({ session }: { session: ConnectedSession }) {
  const app = session.appLabel?.trim() || "App";
  const person = session.userDisplayName?.trim() || "—";
  const company = session.companyName?.trim();
  const pos = session.pointOfSaleName?.trim();

  return (
    <article
      className="print-session-card min-w-0"
      title={[app, person, company, pos].filter(Boolean).join(" · ")}
    >
      <p className="truncate text-sm font-semibold text-foreground">{escapeHtml(app)}</p>
      <p className="mt-0.5 truncate text-xs text-foreground">{escapeHtml(person)}</p>
      {company ? (
        <p className="mt-1 truncate text-[0.6875rem] text-muted-foreground">{escapeHtml(company)}</p>
      ) : null}
      {pos ? (
        <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{escapeHtml(pos)}</p>
      ) : null}
    </article>
  );
}

export default function App() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [localLines, setLocalLines] = useState<MappingLineRow[]>([]);
  const [settings, setSettings] = useState({
    listenPort: "",
    wssListenPort: "",
    wssEnabled: false,
    agentDisplayName: DEFAULT_AGENT_DISPLAY_NAME,
  });

  const [configEdit, setConfigEdit] = useState(false);
  const [settingsSaveBusy, setSettingsSaveBusy] = useState(false);
  const [networkBusy, setNetworkBusy] = useState(false);
  const [lineTestBusyId, setLineTestBusyId] = useState<string | null>(null);

  /** Solo mostramos acciones en la fila del summary cuando el `<details>` está expandido */
  const [configDetailsOpen, setConfigDetailsOpen] = useState(false);
  const [printersDetailsOpen, setPrintersDetailsOpen] = useState(false);

  const applyDashboardFull = useCallback((d: DashboardPayload) => {
    setDashboard(d);
    const lines = (d.mappingLines ?? []).map((row) => ({
      id: String(row.id ?? newLineId()),
      purpose: normalizeMappingPurpose(row.purpose),
      systemPrinterName: String(row.systemPrinterName ?? ""),
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
      displayLabel: row.displayLabel ? String(row.displayLabel) : undefined,
    }));
    setLocalLines(lines);
    setSettings({
      listenPort: d.listenPort != null ? String(d.listenPort) : "",
      wssListenPort: d.wssListenPort != null ? String(d.wssListenPort) : "",
      wssEnabled: !!d.wssEnabled,
      agentDisplayName: normalizeAgentDisplayName(d.agentDisplayName),
    });
    setConfigEdit(false);
  }, []);

  const mergeDashboardLive = useCallback((d: DashboardPayload) => {
    setDashboard((prev) => {
      if (!prev) return d;
      return {
        ...prev,
        serviceStatus: d.serviceStatus ?? prev.serviceStatus,
        jobs: d.jobs,
        metrics: d.metrics,
        printerHealth: d.printerHealth,
        printers: d.printers,
        wsListening: d.wsListening,
        wssListening: d.wssListening,
      };
    });
  }, []);

  const fetchDashboard = useCallback(
    async (mode: "full" | "live") => {
      try {
        const d = (await invoke("get_dashboard")) as DashboardPayload;
        if (mode === "full") {
          applyDashboardFull(d);
        } else {
          mergeDashboardLive(d);
        }
      } catch {
        if (mode === "full") {
          setDashboard((prev) => prev ?? {});
          try {
            const port = await invoke("get_listen_port");
            setDashboard((p) => ({ ...p, listenPort: Number(port) }));
          } catch {
            setDashboard((p) => ({ ...p, listenPort: 14567 }));
          }
          try {
            const wss = await invoke("get_wss_listen_port");
            setDashboard((p) => ({ ...p, wssListenPort: Number(wss) }));
          } catch {
            setDashboard((p) => ({ ...p, wssListenPort: 14568 }));
          }
        }
      }
    },
    [applyDashboardFull, mergeDashboardLive],
  );

  useEffect(() => {
    void getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion(null));
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      await fetchDashboard("full");
      unlisten = await listen("dashboard-update", () => {
        void fetchDashboard("live");
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [fetchDashboard]);

  const printers = dashboard?.printers ?? [];
  const jobs = dashboard?.jobs ?? [];
  const sessions = dashboard?.serviceStatus?.sessions ?? [];
  const wsListening = Boolean(dashboard?.wsListening);
  const wssListening = Boolean(dashboard?.wssListening);
  const wssEnabledCfg = Boolean(dashboard?.wssEnabled);
  /** WS activo; si WSS está habilitado en config, exige también WSS a la escucha. */
  const serviceOperational = wsListening && (!wssEnabledCfg || wssListening);

  async function handleSaveLines() {
    const withPrinter = localLines.filter((l) => l.systemPrinterName.trim().length > 0);
    const missingAlias = withPrinter.some((l) => !l.displayLabel?.trim());
    if (missingAlias) {
      window.alert("Cada línea con impresora asignada necesita un alias.");
      return;
    }
    const payload = withPrinter.map((l, idx) => ({
      id: l.id,
      purpose: l.purpose,
      systemPrinterName: l.systemPrinterName.trim(),
      sortOrder: idx,
      displayLabel: l.displayLabel!.trim(),
    }));
    try {
      await invoke("set_mapping_lines", { lines: payload });
      await fetchDashboard("full");
    } catch {}
  }

  async function handleSaveSettings(): Promise<boolean> {
    const agentName = settings.agentDisplayName.trim();
    if (!agentName) {
      window.alert("El nombre del agente de impresión es obligatorio.");
      return false;
    }
    const patch = {
      listenPort: settings.listenPort ? Number(settings.listenPort) : undefined,
      wssListenPort: settings.wssListenPort ? Number(settings.wssListenPort) : undefined,
      wssEnabled: settings.wssEnabled,
      agentDisplayName: agentName,
    };
    setSettingsSaveBusy(true);
    try {
      await invoke("set_service_settings", { patch });
      setConfigEdit(false);
      await fetchDashboard("full");
      return true;
    } catch {
      window.alert("No se pudo guardar la configuración.");
      return false;
    } finally {
      setSettingsSaveBusy(false);
    }
  }

  async function handleConfigToolbarClick() {
    if (settingsSaveBusy) return;
    if (configEdit) {
      await handleSaveSettings();
    } else {
      setConfigEdit(true);
    }
  }

  async function handleLineTestPrint(line: MappingLineRow) {
    const printer = line.systemPrinterName.trim();
    if (!printer) {
      window.alert("Seleccioná una impresora del sistema para esta línea antes de imprimir una prueba.");
      return;
    }
    const aliasOk = Boolean(line.displayLabel?.trim());
    if (!aliasOk) {
      window.alert("Completá el alias de la línea.");
      return;
    }
    setLineTestBusyId(line.id);
    try {
      await invoke("queue_test_print", { purpose: line.purpose, systemPrinterName: printer });
      await fetchDashboard("live");
    } catch {
      window.alert("No se pudo encolar la prueba de impresión.");
    } finally {
      setLineTestBusyId(null);
    }
  }

  async function handleCancelJob(jobId: string | undefined) {
    if (!jobId) return;
    try {
      await invoke("cancel_print_job", { job_id: jobId });
      await fetchDashboard("live");
    } catch {}
  }

  async function handleCancelAllJobs() {
    if (jobs.length === 0) return;
    const n = jobs.length;
    if (!window.confirm(`¿Quitar los ${n} trabajos de la cola?`)) return;
    try {
      await invoke<void>("cancel_all_print_jobs", {});
      await fetchDashboard("full");
    } catch {
      window.alert("No se pudieron quitar todos los trabajos.");
    }
  }

  async function togglePrintNetwork() {
    if (networkBusy) return;
    setNetworkBusy(true);
    try {
      if (serviceOperational) {
        await invoke("stop_print_network");
      } else {
        await invoke("start_print_network");
      }
      await fetchDashboard("full");
    } catch (e: unknown) {
      const msg =
        typeof e === "string"
          ? e
          : e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
            ? (e as Error).message
            : "Error desconocido";
      window.alert(`No se pudo cambiar el servicio de impresión (WS/WSS).\n\n${msg}`);
    } finally {
      setNetworkBusy(false);
    }
  }

  function addMappingLine() {
    setLocalLines((prev) => [
      ...prev,
      {
        id: newLineId(),
        purpose: DEFAULT_PURPOSE,
        systemPrinterName: "",
        sortOrder: prev.length,
      },
    ]);
  }

  function removeLine(id: string) {
    setLocalLines((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <>
      <header className="print-top-bar" aria-label="Estado del servicio de impresión">
        <div className="mx-auto flex h-full max-w-[400px] min-w-0 items-center gap-2 px-3">
          <span className="min-w-0 flex-1 text-sm font-semibold tracking-tight">
            Estado del servicio de impresión
          </span>
          <IconButton
            type="button"
            icon="Power"
            variant="ghost"
            size="sm"
            disabled={networkBusy}
            title={
              serviceOperational
                ? "Servicio activo (WS/WSS según configuración) — clic para apagar"
                : "Servicio detenido — clic para iniciar"
            }
            ariaLabel={
              serviceOperational ? "Apagar servicio de impresión (WS/WSS)" : "Encender servicio de impresión (WS/WSS)"
            }
            className={`shrink-0 ${
              serviceOperational
                ? "text-success! hover:text-success! hover:bg-transparent!"
                : "text-error! hover:text-error! hover:bg-transparent!"
            }`}
            onClick={() => void togglePrintNetwork()}
          />
        </div>
      </header>

      <main className="print-app-main relative mx-auto max-w-[400px] min-w-0 overflow-x-hidden">
      <div className="min-w-0 divide-y divide-border *:min-w-0 *:max-w-full *:px-1">
        <details className="print-acc min-w-0 max-w-full overflow-hidden py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="text-sm">Clientes conectados</span>
          <span className="ml-auto text-xs font-normal text-muted-foreground">{sessions.length}</span>
        </summary>
        {sessions.length > 0 ? (
          <div className="max-h-48 space-y-2 overflow-y-auto py-2">
            {sessions.map((s) => (
              <ConnectedSessionCard key={s.connectionId ?? s.clientId} session={s} />
            ))}
          </div>
        ) : null}
      </details>

      <details
        className="print-acc min-w-0 max-w-full overflow-hidden py-3"
        open={configDetailsOpen}
        onToggle={(e) => setConfigDetailsOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">Configuración</span>
          {configDetailsOpen ? (
            <IconButton
              type="button"
              icon={configEdit ? "Save" : "Pencil"}
              variant="basicSecondary"
              size="xs"
              className="shrink-0"
              ariaLabel={configEdit ? "Guardar configuración" : "Editar configuración"}
              disabled={settingsSaveBusy}
              onClick={(e) => {
                e.preventDefault();
                void handleConfigToolbarClick();
              }}
            />
          ) : null}
        </summary>
        <div className="space-y-3 py-2">
          <SharedTextField
            label="Nombre del agente de impresión"
            name="agent-display-name"
            type="text"
            density="compact"
            required
            readOnly={!configEdit}
            disabled={!configEdit}
            value={settings.agentDisplayName}
            onChange={(e) => setSettings((s) => ({ ...s, agentDisplayName: e.target.value }))}
          />
          <SharedTextField
            label="Puerto WS"
            name="in-ws-port"
            type="number"
            density="compact"
            min={1}
            max={65535}
            readOnly={!configEdit}
            disabled={!configEdit}
            value={settings.listenPort}
            onChange={(e) => setSettings((s) => ({ ...s, listenPort: e.target.value }))}
          />
          <SharedTextField
            label="Puerto WSS"
            name="in-wss-port"
            type="number"
            density="compact"
            min={1}
            max={65535}
            readOnly={!configEdit}
            disabled={!configEdit}
            value={settings.wssListenPort}
            onChange={(e) => setSettings((s) => ({ ...s, wssListenPort: e.target.value }))}
          />
          <Switch
            label="WSS habilitado"
            labelPosition="right"
            disabled={!configEdit}
            checked={settings.wssEnabled}
            onChange={(wssEnabled) => setSettings((s) => ({ ...s, wssEnabled }))}
            data-test-id="config-wss-enabled"
          />
        </div>
      </details>

      <details
        className="print-acc min-w-0 max-w-full overflow-hidden py-3"
        open={printersDetailsOpen}
        onToggle={(e) => setPrintersDetailsOpen(e.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">Impresoras</span>
          {printersDetailsOpen ? (
            <>
              <IconButton
                type="button"
                icon="Plus"
                variant="basicSecondary"
                size="xs"
                className="shrink-0"
                ariaLabel="Agregar línea"
                onClick={(e) => {
                  e.preventDefault();
                  addMappingLine();
                }}
              />
              <IconButton
                type="button"
                icon="Save"
                variant="basicSecondary"
                size="xs"
                className="shrink-0"
                ariaLabel="Guardar impresoras"
                onClick={(e) => {
                  e.preventDefault();
                  void handleSaveLines();
                }}
              />
            </>
          ) : null}
        </summary>
        <div className="space-y-3 py-2">
          {localLines.length > 0 ? (
            <div className="divide-y divide-border">
              {localLines.map((line) => {
              const purposeOpts = PURPOSES.map(({ id, label }) => ({ id, label }));
              const printerOpts: { id: string; label: string }[] = [];
              for (const p of printers) {
                const def = p.default ? " ★" : "";
                const off = p.online === false ? " [off]" : "";
                printerOpts.push({ id: p.name, label: `${p.name}${def}${off}` });
              }
              if (line.systemPrinterName && !printers.some((x) => x.name === line.systemPrinterName)) {
                printerOpts.push({ id: line.systemPrinterName, label: `${line.systemPrinterName} (no listada)` });
              }
              return (
                <div key={line.id} className="flex flex-col gap-3 py-3">
                  <Select
                    label="Propósito"
                    placeholder="Seleccionar"
                    density="compact"
                    value={line.purpose}
                    onChange={(id) =>
                      setLocalLines((rows) =>
                        rows.map((r) => (r.id === line.id ? { ...r, purpose: String(id ?? DEFAULT_PURPOSE) } : r)),
                      )
                    }
                    options={purposeOpts}
                    name={`purpose-${line.id}`}
                  />
                  <Select
                    label="Impresora del sistema"
                    placeholder="Seleccionar"
                    density="compact"
                    value={line.systemPrinterName || null}
                    onChange={(pid) =>
                      setLocalLines((rows) =>
                        rows.map((r) => (r.id === line.id ? { ...r, systemPrinterName: pid == null ? "" : String(pid) } : r)),
                      )
                    }
                    options={printerOpts}
                    name={`printer-${line.id}`}
                  />
                  <SharedTextField
                    label="Alias"
                    name={`alias-${line.id}`}
                    type="text"
                    density="compact"
                    placeholder="Ej. Tickets caja 1"
                    required
                    value={line.displayLabel ?? ""}
                    onChange={(e) =>
                      setLocalLines((rows) =>
                        rows.map((r) => (r.id === line.id ? { ...r, displayLabel: e.target.value } : r)),
                      )
                    }
                  />
                  <div className="mt-2 flex shrink-0 justify-end gap-1">
                    <IconButton
                      type="button"
                      icon="Trash2"
                      variant="basicSecondary"
                      size="xs"
                      ariaLabel="Eliminar línea"
                      onClick={() => removeLine(line.id)}
                    />
                    <IconButton
                      type="button"
                      icon="Printer"
                      variant="basicSecondary"
                      size="xs"
                      disabled={!line.systemPrinterName.trim() || !line.displayLabel?.trim() || lineTestBusyId === line.id}
                      isLoading={lineTestBusyId === line.id}
                      ariaLabel={`Prueba de impresión en ${line.systemPrinterName.trim() || "esta línea"}`}
                      onClick={() => void handleLineTestPrint(line)}
                    />
                  </div>
                </div>
              );
            })}
            </div>
          ) : null}
        </div>
      </details>

      <details className="print-acc min-w-0 max-w-full overflow-hidden py-3">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 py-2 font-semibold [&::-webkit-details-marker]:hidden">
          <ChevronDown className="print-acc-chevron h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
          <span className="min-w-0 text-sm">Cola</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-xs font-normal text-muted-foreground">{jobs.length}</span>
            {jobs.length > 0 ? (
              <IconButton
                type="button"
                icon="Trash2"
                variant="basicSecondary"
                size="xs"
                className="shrink-0"
                ariaLabel="Quitar todos los trabajos de la cola"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleCancelAllJobs();
                }}
              />
            ) : null}
          </span>
        </summary>
        <div className="min-w-0 w-full overflow-x-auto py-2">
          <table className="w-max min-w-full border-collapse text-[0.7rem]">
            <thead>
              <tr className="border-b border-border bg-neutral/50">
                <th
                  scope="col"
                  className="sticky left-0 z-41 min-w-11 border-border border-r bg-neutral/50 px-1 py-1.5 text-center font-semibold shadow-[4px_0_10px_-3px_rgb(0_0_0/0.12)]"
                >
                  <span className="sr-only">Eliminar</span>
                </th>
                <th className="p-1.5 text-left font-semibold">Estado</th>
                <th className="p-1.5 text-left font-semibold">Doc</th>
                <th className="p-1.5 text-left font-semibold">Folio</th>
                <th className="p-1.5 text-left font-semibold">App</th>
                <th className="p-1.5 text-left font-semibold">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border-b border-border p-2 text-muted-foreground">
                    Sin pendientes ni errores.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id ?? `${j.createdAt}-${j.filename}`} className="border-b border-border last:border-b-0">
                    <td className="sticky left-0 z-40 min-w-11 border-border border-r bg-background px-0.5 py-1.5 align-middle shadow-[4px_0_10px_-3px_rgb(0_0_0/0.12)]">
                      <div className="flex justify-center">
                        {j.id ? (
                          <IconButton
                            type="button"
                            icon="Trash2"
                            variant="basicSecondary"
                            size="xs"
                            ariaLabel="Quitar trabajo de la cola"
                            onClick={() => void handleCancelJob(j.id)}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="p-1.5 align-top">
                      <code className="print-code text-[0.65rem]">{escapeHtml(j.status)}</code>
                    </td>
                    <td className="max-w-18 truncate p-1.5 align-top" title={escapeHtml(j.documentType || j.filename || "")}>
                      {escapeHtml(j.documentType || j.filename || "—")}
                    </td>
                    <td className="max-w-16 truncate p-1.5 align-top">{escapeHtml(j.internalFolio || "—")}</td>
                    <td className="max-w-16 truncate p-1.5 align-top">{escapeHtml(j.sourceApp || "—")}</td>
                    <td className="max-w-16 truncate p-1.5 align-top">{escapeHtml(j.requestedBy || "—")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </details>

        <footer className="py-4 text-center text-[0.7rem] text-muted-foreground">
          <img
            src="/logo.png"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-2 h-14 w-14 object-contain"
            aria-hidden
          />
          <p className="font-medium text-foreground">{APP_NAME}{appVersion ? ` ${appVersion}` : ""}</p>
          <p>{APP_COPYRIGHT}</p>
        </footer>
      </div>
      </main>
    </>
  );
}
