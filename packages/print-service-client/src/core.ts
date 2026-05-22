import type { PosSaleTicketPayload, PosSaleTicketPrintExtras } from "./pos-sale-ticket";
import type {
  PosQuotationTicketPayload,
  PosQuotationTicketPrintExtras,
} from "./pos-quotation-ticket";
import type {
  PosCustomerCreditNoteTicketPayload,
  PosCustomerCreditNoteTicketPrintExtras,
} from "./pos-customer-credit-note-ticket";
import type {
  PosCashClosingTicketPayload,
  PosCashClosingTicketPrintExtras,
} from "./pos-cash-closing-ticket";

/** Protocol version sent to the local print agent (see docs/print_service_app_developer_guide_v2.md). */
export const PRINT_PROTOCOL_VERSION = "2.1";

/**
 * Subcadena que el agente incluye en el close frame WebSocket al detener WS/WSS desde su UI (botón Energía).
 * Debe coincidir con `WS_CLOSE_REASON_SERVICE_STOPPED` en `print-service/src-tauri/src/ws.rs`.
 */
export const PRINT_WS_CLOSE_REASON_SERVICE_STOPPED = "flowstore:service_stopped";

export type PrintAgentVisualStatus = "off" | "connecting" | "ok" | "degraded" | "error";

/**
 * `localhost` suele resolverse a `::1` (IPv6) y el agente a veces solo escuchaba en `127.0.0.1` (IPv4) → conexión fallida.
 * Forzamos IPv4 de loopback para coincidir con el listener por defecto; el servidor también puede escuchar en `[::1]`.
 */
export function normalizePrintAgentHost(host: string): string {
  const t = (host || "").trim();
  if (!t) return "127.0.0.1";
  const lower = t.toLowerCase();
  if (lower === "localhost" || lower === "::1" || lower === "[::1]") return "127.0.0.1";
  return t;
}

export function buildWebSocketUrl(host: string, port: number, useTls: boolean): string {
  const h = normalizePrintAgentHost(host);
  const scheme = useTls ? "wss" : "ws";
  return `${scheme}://${h}:${port}`;
}

export type PrinterHealthPayload = {
  overall?: string;
  message?: string;
  purposes?: Record<
    string,
    {
      status?: string;
      printerName?: unknown;
      reason?: unknown;
    }
  >;
};

/** Capacidades del agente (protocolo 2.1+). */
export const AGENT_CAPABILITY_POS_SALE_TICKET = "pos-sale-ticket";
export const AGENT_CAPABILITY_POS_QUOTATION_TICKET = "pos-quotation-ticket";
export const AGENT_CAPABILITY_POS_CUSTOMER_CREDIT_NOTE_TICKET =
  "pos-customer-credit-note-ticket";
export const AGENT_CAPABILITY_POS_CASH_CLOSING_TICKET = "pos-cash-closing-ticket";
export const AGENT_CAPABILITY_PDF_BASE64 = "pdf-base64";

export type AgentMappingLineConfig = {
  purpose?: string;
  systemPrinterName?: string;
  sortOrder?: number;
  displayLabel?: string | null;
  ticketEscposEnabled?: boolean;
};

export type HelloResponseData = {
  agentCapabilities?: string[];
  /** Primera impresora de tickets sin alias; ver `agentTicketEscposEnabled` con alias POS. */
  ticketEscposEnabled?: boolean;
  serviceStatus?: {
    status?: string;
    connectedClients?: number;
    sessions?: Array<{
      connectionId?: string;
      clientId?: string;
      appLabel?: string;
      userDisplayName?: string;
      companyName?: string;
      pointOfSaleName?: string;
      requiredPurposes?: string[];
    }>;
  };
  printerHealth?: PrinterHealthPayload;
};

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type PendingEntry = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
};

export type PrintServiceWsCloseInfo = {
  code: number;
  reason: string;
  wasClean: boolean;
};

export type PrintServiceConnectionOptions = {
  /** WebSocket URL e.g. ws://127.0.0.1:14567 */
  url: string;
  clientId?: string;
  requiredPurposes?: string[];
  /** Etiqueta de la app (p. ej. "Punto de venta", "Panel de administración"). */
  appLabel?: string;
  /** Nombre visible del usuario conectado. */
  userDisplayName?: string;
  /** Empresa (fantasía o razón social) — visible en KaiPrinters. */
  companyName?: string;
  /** Punto de venta (solo POS) — visible en KaiPrinters. */
  pointOfSaleName?: string;
  onHello?: (data: HelloResponseData) => void;
  onPrinterHealth?: (payload: PrinterHealthPayload) => void;
  onServiceStatus?: (payload: unknown) => void;
  onConfigChanged?: () => void;
  onPrintJobDone?: (jobId: string) => void;
  onPrintJobFailed?: (jobId: string, error: string) => void;
  onOpen?: () => void;
  onClose?: (info: PrintServiceWsCloseInfo) => void;
  onError?: (message: string) => void;
};

export type PrintServiceDisconnectOptions = {
  /**
   * - `default`: si el socket sigue CONNECTING, programa un cierre (Chrome puede mostrar aviso).
   * - `abandon`: solo limpia handlers; no fuerza `close()` en CONNECTING (probes / timeouts sin ruido).
   */
  ifConnecting?: "default" | "abandon";
};

/**
 * WebSocket client: sends `hello`, then handles JSON lines (responses + server events).
 */
export class PrintServiceConnection {
  private ws: WebSocket | null = null;
  private readonly pending = new Map<string, PendingEntry>();
  /** Si `disconnect()` ocurre en CONNECTING, aplazamos un `close()` duro para no dejar el socket colgado. */
  private connectTeardownTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private helloPayload: HelloResponseData | null = null;
  private helloWaiters: Array<{
    resolve: (d: HelloResponseData) => void;
    reject: (e: Error) => void;
  }> = [];

  constructor(private readonly opts: PrintServiceConnectionOptions) {}

  private deliverHello(data: HelloResponseData): void {
    this.helloPayload = data;
    this.opts.onHello?.(data);
    const waiters = this.helloWaiters.splice(0);
    for (const w of waiters) {
      w.resolve(data);
    }
  }

  /**
   * Espera la respuesta `hello` del agente (capabilities, printerHealth).
   * Sin esto, `onHello` puede llegar después del primer `print` y el POS cree que no hay vector/ESC/POS.
   */
  waitForHello(timeoutMs = 6_000): Promise<HelloResponseData> {
    if (this.helloPayload) {
      return Promise.resolve(this.helloPayload);
    }
    return new Promise((resolve, reject) => {
      const timer = globalThis.setTimeout(() => {
        const idx = this.helloWaiters.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) this.helloWaiters.splice(idx, 1);
        reject(new Error("hello_timeout"));
      }, timeoutMs);
      this.helloWaiters.push({
        resolve: (d) => {
          globalThis.clearTimeout(timer);
          resolve(d);
        },
        reject: (e) => {
          globalThis.clearTimeout(timer);
          reject(e);
        },
      });
    });
  }

  /**
   * Espera a `readyState === OPEN` (handshake listo). Útil en UI de prueba para no llamar
   * `disconnect()` mientras sigue CONNECTING (Chrome loguea ruido si se cierra antes).
   */
  waitForOpen(timeoutMs = 20_000): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let tickHandle: ReturnType<typeof globalThis.setTimeout> | null = null;
      const finish = (kind: "open" | "closed" | "not_started" | "timeout") => {
        if (settled) return;
        settled = true;
        if (tickHandle != null) {
          globalThis.clearTimeout(tickHandle);
          tickHandle = null;
        }
        if (kind === "open") resolve();
        else if (kind === "closed") reject(new Error("closed_before_open"));
        else if (kind === "not_started") reject(new Error("not_started"));
        else reject(new Error("open_timeout"));
      };
      const deadline = Date.now() + timeoutMs;
      const step = () => {
        if (settled) return;
        const ws = this.ws;
        if (!ws) {
          finish("not_started");
          return;
        }
        const s = ws.readyState;
        if (s === WebSocket.OPEN) {
          finish("open");
          return;
        }
        if (s === WebSocket.CLOSING || s === WebSocket.CLOSED) {
          finish("closed");
          return;
        }
        if (Date.now() >= deadline) {
          finish("timeout");
          return;
        }
        tickHandle = globalThis.setTimeout(step, 50);
      };
      step();
    });
  }

  connect(): void {
    if (this.connectTeardownTimer != null) {
      globalThis.clearTimeout(this.connectTeardownTimer);
      this.connectTeardownTimer = null;
    }
    this.helloPayload = null;
    this.helloWaiters = [];
    try {
      const ws = new WebSocket(this.opts.url);
      this.ws = ws;
      ws.onopen = () => {
        this.opts.onOpen?.();
        this.sendHello();
      };
      ws.onclose = (ev) => {
        this.opts.onClose?.({
          code: ev.code,
          reason: ev.reason,
          wasClean: ev.wasClean,
        });
        this.ws = null;
        for (const [, p] of this.pending) {
          p.reject(new Error("closed"));
        }
        this.pending.clear();
      };
      ws.onerror = () => {
        this.opts.onError?.("WebSocket error");
      };
      ws.onmessage = (ev) => {
        const text = typeof ev.data === "string" ? ev.data : "";
        this.handleLine(text);
      };
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e.message : String(e));
    }
  }

  disconnect(opts?: PrintServiceDisconnectOptions): void {
    const ifConnecting = opts?.ifConnecting ?? "default";
    const ws = this.ws;
    if (!ws) {
      if (this.connectTeardownTimer != null) {
        globalThis.clearTimeout(this.connectTeardownTimer);
        this.connectTeardownTimer = null;
      }
      return;
    }
    this.ws = null;

    for (const [, p] of this.pending) {
      p.reject(new Error("closed"));
    }
    this.pending.clear();

    const state = ws.readyState;

    if (state === WebSocket.CONNECTING) {
      if (ifConnecting === "abandon") {
        if (this.connectTeardownTimer != null) {
          globalThis.clearTimeout(this.connectTeardownTimer);
          this.connectTeardownTimer = null;
        }
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        return;
      }
      // Cerrar aquí dispara en Chrome: "WebSocket is closed before the connection is established"
      // (típico en cleanup de React / Strict Mode). Cerramos tras `open` o con timeout acotado.
      ws.onmessage = null;
      ws.onerror = null;
      const prevOnClose = ws.onclose;
      ws.onclose = (ev: CloseEvent) => {
        if (this.connectTeardownTimer != null) {
          globalThis.clearTimeout(this.connectTeardownTimer);
          this.connectTeardownTimer = null;
        }
        prevOnClose?.call(ws, ev);
      };
      ws.onopen = () => {
        if (this.connectTeardownTimer != null) {
          globalThis.clearTimeout(this.connectTeardownTimer);
          this.connectTeardownTimer = null;
        }
        try {
          ws.close(1000, "client_disconnect");
        } catch {
          /* noop */
        }
      };
      this.connectTeardownTimer = globalThis.setTimeout(() => {
        this.connectTeardownTimer = null;
        try {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.onopen = null;
            ws.onclose = null;
            ws.close();
          }
        } catch {
          /* noop */
        }
      }, 800);
      return;
    }

    if (this.connectTeardownTimer != null) {
      globalThis.clearTimeout(this.connectTeardownTimer);
      this.connectTeardownTimer = null;
    }

    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (state === WebSocket.OPEN || state === WebSocket.CLOSING) {
      try {
        ws.close(1000, "client_disconnect");
      } catch {
        /* noop */
      }
    }
  }

  ping(): Promise<unknown> {
    return this.request("ping", {});
  }

  getPrinters(): Promise<unknown> {
    return this.request("get_printers", {});
  }

  setPrinterMapping(purpose: string, printerName: string): Promise<unknown> {
    return this.request("set_printer_mapping", { purpose, printerName });
  }

  /** Reemplaza todas las líneas de mapeo (failover por `sortOrder`). */
  setMappingLines(
    lines: Array<{
      id: string;
      purpose: string;
      systemPrinterName: string;
      sortOrder: number;
      displayLabel?: string | null;
    }>,
  ): Promise<unknown> {
    return this.request("set_mapping_lines", { lines });
  }

  getConfig(): Promise<unknown> {
    return this.request("get_config", {});
  }

  /** Encola el PDF de prueba mínimo del agente (sin payload en el cliente). */
  requestTestPrint(purpose?: string): Promise<unknown> {
    return this.request("test_print", { purpose: purpose ?? "documents" });
  }

  /** Encola un PDF (base64) en el agente. Incluye metadatos opcionales acordados en protocolo 2.1. */
  enqueuePrint(extra: Record<string, unknown>): Promise<unknown> {
    return this.request("print", extra);
  }

  /**
   * Igual que `enqueuePrint`, pero añade `printerDisplayLabel` según la elección del POS en localStorage
   * (`readPosPurposePrinterAliasesFromStorage` / pantalla Impresión local).
   */
  enqueuePosPrint(extra: Record<string, unknown>): Promise<unknown> {
    const purpose = typeof extra.purpose === "string" ? extra.purpose : "documents";
    return this.enqueuePrint(mergePrinterDisplayLabelForPurposeIntoPrintExtras(purpose, { ...extra }));
  }

  /**
   * Ticket de venta POS: el agente genera PDF vectorial desde JSON (`type: "pos-sale-ticket"`).
   * @param omitPrinterDisplayLabel Si true, usa solo mapeo por propósito (sin alias del POS).
   */
  enqueuePosSaleTicket(
    ticket: PosSaleTicketPayload,
    extras: PosSaleTicketPrintExtras & { purpose?: string },
    omitPrinterDisplayLabel = false,
  ): Promise<unknown> {
    const purpose = extras.purpose ?? "tickets";
    const body: Record<string, unknown> = {
      purpose,
      type: "pos-sale-ticket",
      ticket,
      filename: extras.filename,
      copies: 1,
      sourceApp: extras.sourceApp ?? "pwa-pos",
      documentType: extras.documentType,
      internalFolio: extras.internalFolio,
    };
    if (omitPrinterDisplayLabel) {
      return this.enqueuePrint(body);
    }
    return this.enqueuePosPrint(body);
  }

  /**
   * Cotización POS: el agente genera PDF o ESC/POS desde JSON (`type: "pos-quotation-ticket"`).
   */
  enqueuePosQuotationTicket(
    ticket: PosQuotationTicketPayload,
    extras: PosQuotationTicketPrintExtras & { purpose?: string },
    omitPrinterDisplayLabel = false,
  ): Promise<unknown> {
    const purpose = extras.purpose ?? "tickets";
    const body: Record<string, unknown> = {
      purpose,
      type: "pos-quotation-ticket",
      ticket,
      filename: extras.filename,
      copies: 1,
      sourceApp: extras.sourceApp ?? "pwa-pos",
      documentType: extras.documentType,
      internalFolio: extras.internalFolio,
    };
    if (omitPrinterDisplayLabel) {
      return this.enqueuePrint(body);
    }
    return this.enqueuePosPrint(body);
  }

  /**
   * Nota de crédito POS: el agente genera PDF o ESC/POS desde JSON (`type: "pos-customer-credit-note-ticket"`).
   */
  enqueuePosCustomerCreditNoteTicket(
    ticket: PosCustomerCreditNoteTicketPayload,
    extras: PosCustomerCreditNoteTicketPrintExtras & { purpose?: string },
    omitPrinterDisplayLabel = false,
  ): Promise<unknown> {
    const purpose = extras.purpose ?? "tickets";
    const body: Record<string, unknown> = {
      purpose,
      type: "pos-customer-credit-note-ticket",
      ticket,
      filename: extras.filename,
      copies: 1,
      sourceApp: extras.sourceApp ?? "pwa-pos",
      documentType: extras.documentType,
      internalFolio: extras.internalFolio,
    };
    if (omitPrinterDisplayLabel) {
      return this.enqueuePrint(body);
    }
    return this.enqueuePosPrint(body);
  }

  /**
   * Arqueo de caja POS: el agente genera PDF o ESC/POS desde JSON (`type: "pos-cash-closing-ticket"`).
   */
  enqueuePosCashClosingTicket(
    ticket: PosCashClosingTicketPayload,
    extras: PosCashClosingTicketPrintExtras & { purpose?: string },
    omitPrinterDisplayLabel = false,
  ): Promise<unknown> {
    const purpose = extras.purpose ?? "tickets";
    const body: Record<string, unknown> = {
      purpose,
      type: "pos-cash-closing-ticket",
      ticket,
      filename: extras.filename,
      copies: 1,
      sourceApp: extras.sourceApp ?? "pwa-pos",
      documentType: extras.documentType,
      internalFolio: extras.internalFolio,
    };
    if (omitPrinterDisplayLabel) {
      return this.enqueuePrint(body);
    }
    return this.enqueuePosPrint(body);
  }

  private sendHello(): void {
    const rid = randomId();
    const body: Record<string, unknown> = {
      version: PRINT_PROTOCOL_VERSION,
      request_id: rid,
      action: "hello",
      client_id: this.opts.clientId ?? "pwa",
    };
    if (this.opts.requiredPurposes?.length) {
      body.requiredPurposes = this.opts.requiredPurposes;
    }
    if (this.opts.appLabel?.trim()) {
      body.appLabel = this.opts.appLabel.trim();
    }
    if (this.opts.userDisplayName?.trim()) {
      body.userDisplayName = this.opts.userDisplayName.trim();
    }
    if (this.opts.companyName?.trim()) {
      body.companyName = this.opts.companyName.trim();
    }
    if (this.opts.pointOfSaleName?.trim()) {
      body.pointOfSaleName = this.opts.pointOfSaleName.trim();
    }
    this.sendRaw(body);
  }

  private sendRaw(obj: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }

  private request(action: string, extra: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("not_connected"));
        return;
      }
      const rid = randomId();
      this.pending.set(rid, { resolve, reject });
      this.sendRaw({
        version: PRINT_PROTOCOL_VERSION,
        request_id: rid,
        action,
        client_id: this.opts.clientId ?? "pwa",
        ...extra,
      });
      globalThis.setTimeout(() => {
        const p = this.pending.get(rid);
        if (p) {
          this.pending.delete(rid);
          p.reject(new Error("timeout"));
        }
      }, 8000);
    });
  }

  private handleLine(text: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return;
    }
    const event = typeof msg.event === "string" ? msg.event : undefined;
    if (event === "printer_health") {
      this.opts.onPrinterHealth?.((msg.payload ?? {}) as PrinterHealthPayload);
      return;
    }
    if (event === "service_status") {
      this.opts.onServiceStatus?.(msg.payload);
      return;
    }
    if (event === "config_changed") {
      this.opts.onConfigChanged?.();
      return;
    }
    if (event === "print_job_done") {
      const p = (msg.payload ?? {}) as { jobId?: string };
      if (p.jobId) this.opts.onPrintJobDone?.(p.jobId);
      return;
    }
    if (event === "print_job_failed") {
      const p = (msg.payload ?? {}) as { jobId?: string; error?: string };
      if (p.jobId) this.opts.onPrintJobFailed?.(p.jobId, p.error ?? "");
      return;
    }

    const rid = typeof msg.request_id === "string" ? msg.request_id : undefined;
    if (rid && this.pending.has(rid)) {
      const entry = this.pending.get(rid)!;
      this.pending.delete(rid);
      if (msg.ok === false) {
        entry.reject(new Error(String(msg.error ?? "error")));
      } else {
        entry.resolve(msg.data ?? {});
      }
      return;
    }

    /** p. ej. `hello` con token inválido: no entra en `pending` pero el servidor responde `ok: false`. */
    if (msg.ok === false) {
      this.opts.onError?.(String(msg.error ?? "error"));
      return;
    }

    if (msg.ok === true && msg.data && typeof msg.data === "object") {
      const d = msg.data as Record<string, unknown>;
      if ("printerHealth" in d || "serviceStatus" in d || "agentCapabilities" in d) {
        this.deliverHello(d as HelloResponseData);
      }
    }
  }
}

export function healthToVisual(
  connected: boolean,
  health: PrinterHealthPayload | null,
  /** True mientras el WebSocket está en vuelo (antes de `onopen` / tras iniciar `connect`). */
  socketConnecting = false,
): PrintAgentVisualStatus {
  if (!connected) {
    if (socketConnecting) return "connecting";
    return "off";
  }
  if (!health) return "connecting";
  const o = health.overall;
  if (o === "ok") return "ok";
  if (o === "degraded") return "degraded";
  return "error";
}

export type PrintServiceNotificationKind = "disconnected" | "job_failed";

export type PrintServiceNotification = {
  id: string;
  at: number;
  kind: PrintServiceNotificationKind;
  level: "error";
  message: string;
  read: boolean;
};

const LS_HOST = "printServiceHost";
const LS_PORT = "printServicePort";
const LS_WSS_PORT = "printServiceWssPort";
const LS_USE_TLS = "printServiceUseTls";
/** Disparado en la misma pestaña tras `writePrintServiceConfigToStorage` (el evento `storage` solo cruza pestañas). */
export const PRINT_SERVICE_CONFIG_CHANGED_EVENT = "flowstore:print-service-config-changed";

export function readPrintServiceConfigFromStorage(): {
  host: string;
  port: number;
  wssPort: number;
  useTls: boolean;
} {
  if (typeof window === "undefined") {
    return { host: "127.0.0.1", port: 14567, wssPort: 14568, useTls: false };
  }
  const host = localStorage.getItem(LS_HOST) || "127.0.0.1";
  const port = Number(localStorage.getItem(LS_PORT) || "14567") || 14567;
  const wssPort = Number(localStorage.getItem(LS_WSS_PORT) || "14568") || 14568;
  const useTls = localStorage.getItem(LS_USE_TLS) === "1";
  return { host, port, wssPort, useTls };
}

export function writePrintServiceConfigToStorage(cfg: {
  host: string;
  port: number;
  wssPort: number;
  useTls: boolean;
}): void {
  localStorage.setItem(LS_HOST, cfg.host);
  localStorage.setItem(LS_PORT, String(cfg.port));
  localStorage.setItem(LS_WSS_PORT, String(cfg.wssPort));
  localStorage.setItem(LS_USE_TLS, cfg.useTls ? "1" : "0");
  if (typeof globalThis.window !== "undefined") {
    globalThis.window.dispatchEvent(new CustomEvent(PRINT_SERVICE_CONFIG_CHANGED_EVENT));
  }
}

/** Elección del POS: impresora por alias (definida en el agente) para tickets / documentos. Solo localStorage. */
const LS_POS_TICKETS_ALIAS = "printPosPurposeTicketsAlias";
const LS_POS_DOCUMENTS_ALIAS = "printPosPurposeDocumentsAlias";

export type PosPrintAgentPurpose = "tickets" | "documents";

/** POS configuró impresión de tickets vía agente (alias elegido en Impresión local). */
export function isPosTicketAgentPrintConfigured(): boolean {
  return isPosAgentPrintConfiguredForPurpose("tickets");
}

/** POS configuró impresión de documentos (hoja) vía agente. */
export function isPosDocumentAgentPrintConfigured(): boolean {
  return isPosAgentPrintConfiguredForPurpose("documents");
}

/** Alias del POS guardado para el propósito indicado. */
export function agentSupportsPosSaleTicket(hello: HelloResponseData | null | undefined): boolean {
  const caps = hello?.agentCapabilities;
  if (Array.isArray(caps) && caps.length > 0) {
    return caps.includes(AGENT_CAPABILITY_POS_SALE_TICKET);
  }
  // KaiPrinters 2.1+ (hello con serviceStatus aunque capabilities lleguen vacías)
  return Boolean(hello?.serviceStatus);
}

export function agentSupportsPosQuotationTicket(
  hello: HelloResponseData | null | undefined,
): boolean {
  const caps = hello?.agentCapabilities;
  if (Array.isArray(caps) && caps.length > 0) {
    return caps.includes(AGENT_CAPABILITY_POS_QUOTATION_TICKET);
  }
  return Boolean(hello?.serviceStatus);
}

export function agentSupportsPosCustomerCreditNoteTicket(
  hello: HelloResponseData | null | undefined,
): boolean {
  const caps = hello?.agentCapabilities;
  if (Array.isArray(caps) && caps.length > 0) {
    return caps.includes(AGENT_CAPABILITY_POS_CUSTOMER_CREDIT_NOTE_TICKET);
  }
  return Boolean(hello?.serviceStatus);
}

export function agentSupportsPosCashClosingTicket(
  hello: HelloResponseData | null | undefined,
): boolean {
  const caps = hello?.agentCapabilities;
  if (Array.isArray(caps) && caps.length > 0) {
    return caps.includes(AGENT_CAPABILITY_POS_CASH_CLOSING_TICKET);
  }
  return Boolean(hello?.serviceStatus);
}

/**
 * Si KaiPrinters imprimirá tickets en ESC/POS (misma resolución que el agente al encolar).
 * Usa alias de Tickets del POS si está configurado; si no, la primera línea del propósito.
 */
export async function agentTicketEscposEnabled(
  conn: PrintServiceConnection,
  purpose: PosPrintAgentPurpose = "tickets",
): Promise<boolean> {
  const { ticketsAlias } = readPosPurposePrinterAliasesFromStorage();
  try {
    const cfg = (await conn.getConfig()) as { mappingLines?: AgentMappingLineConfig[] };
    const lines = (cfg.mappingLines ?? []).filter((l) => l.purpose === purpose);
    if (ticketsAlias && purpose === "tickets") {
      const matched = lines.find((l) => (l.displayLabel ?? "").trim() === ticketsAlias);
      if (matched) return matched.ticketEscposEnabled === true;
    }
    const ordered = [...lines].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    if (ordered[0]) return ordered[0].ticketEscposEnabled === true;
  } catch {
    /* get_config opcional */
  }
  return false;
}

export function isPosAgentPrintConfiguredForPurpose(purpose: PosPrintAgentPurpose): boolean {
  if (typeof window === "undefined") return false;
  const { ticketsAlias, documentsAlias } = readPosPurposePrinterAliasesFromStorage();
  if (purpose === "tickets") return ticketsAlias.length > 0;
  return documentsAlias.length > 0;
}

export function readPosPurposePrinterAliasesFromStorage(): {
  ticketsAlias: string;
  documentsAlias: string;
} {
  if (typeof window === "undefined") {
    return { ticketsAlias: "", documentsAlias: "" };
  }
  return {
    ticketsAlias: (localStorage.getItem(LS_POS_TICKETS_ALIAS) || "").trim(),
    documentsAlias: (localStorage.getItem(LS_POS_DOCUMENTS_ALIAS) || "").trim(),
  };
}

export function writePosPurposePrinterAliasesToStorage(aliases: {
  ticketsAlias?: string;
  documentsAlias?: string;
}): void {
  if (typeof window === "undefined") return;
  if (aliases.ticketsAlias !== undefined) {
    const t = aliases.ticketsAlias.trim();
    if (t) localStorage.setItem(LS_POS_TICKETS_ALIAS, t);
    else localStorage.removeItem(LS_POS_TICKETS_ALIAS);
  }
  if (aliases.documentsAlias !== undefined) {
    const t = aliases.documentsAlias.trim();
    if (t) localStorage.setItem(LS_POS_DOCUMENTS_ALIAS, t);
    else localStorage.removeItem(LS_POS_DOCUMENTS_ALIAS);
  }
}

/** Alias de impresora por propósito en pwa-admin (solo localStorage). */
const LS_ADMIN_TICKETS_ALIAS = "printAdminPurposeTicketsAlias";
const LS_ADMIN_DOCUMENTS_ALIAS = "printAdminPurposeDocumentsAlias";

export function readAdminPurposePrinterAliasFromStorage(): {
  ticketsAlias: string;
  documentsAlias: string;
} {
  if (typeof window === "undefined") {
    return { ticketsAlias: "", documentsAlias: "" };
  }
  return {
    ticketsAlias: (localStorage.getItem(LS_ADMIN_TICKETS_ALIAS) || "").trim(),
    documentsAlias: (localStorage.getItem(LS_ADMIN_DOCUMENTS_ALIAS) || "").trim(),
  };
}

export function writeAdminPurposePrinterAliasToStorage(aliases: {
  ticketsAlias?: string;
  documentsAlias?: string;
}): void {
  if (typeof window === "undefined") return;
  if (aliases.ticketsAlias !== undefined) {
    const t = aliases.ticketsAlias.trim();
    if (t) localStorage.setItem(LS_ADMIN_TICKETS_ALIAS, t);
    else localStorage.removeItem(LS_ADMIN_TICKETS_ALIAS);
  }
  if (aliases.documentsAlias !== undefined) {
    const t = aliases.documentsAlias.trim();
    if (t) localStorage.setItem(LS_ADMIN_DOCUMENTS_ALIAS, t);
    else localStorage.removeItem(LS_ADMIN_DOCUMENTS_ALIAS);
  }
}

export function isAdminAgentPrintConfiguredForPurpose(purpose: string): boolean {
  if (typeof window === "undefined") return false;
  const { ticketsAlias, documentsAlias } = readAdminPurposePrinterAliasFromStorage();
  const p = (purpose || "documents").trim().toLowerCase();
  if (p === "tickets") return ticketsAlias.length > 0;
  return documentsAlias.length > 0;
}

/**
 * Añade `printerDisplayLabel` al payload de `print` según propósito y alias guardados en admin.
 */
export function mergeAdminPrinterDisplayLabelForPurposeIntoPrintExtras(
  purpose: string,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const { ticketsAlias, documentsAlias } = readAdminPurposePrinterAliasFromStorage();
  const p = (purpose || "documents").trim().toLowerCase();
  const lbl = p === "tickets" ? ticketsAlias : documentsAlias;
  if (!lbl) return extra;
  return { ...extra, printerDisplayLabel: lbl };
}

/**
 * @deprecated Usar `mergeAdminPrinterDisplayLabelForPurposeIntoPrintExtras("documents", extra)`.
 */
export function mergeAdminPrinterDisplayLabelIntoPrintExtras(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return mergeAdminPrinterDisplayLabelForPurposeIntoPrintExtras("documents", extra);
}

/** Formato de impresión en administración (ticket 80 mm vs hoja). */
export type AdminDocumentPrintMode = "ticket" | "document";

export type AdminDocumentPrintKind = "sale" | "backorder";

export const ADMIN_DOCUMENT_PRINT_MODES_CHANGED_EVENT =
  "flowstore:admin-document-print-modes-changed";

const LS_ADMIN_DOC_PRINT_SALE = "printAdminDocPrintSale";
const LS_ADMIN_DOC_PRINT_BACKORDER = "printAdminDocPrintBackorder";

const DEFAULT_ADMIN_DOCUMENT_PRINT_MODES: Record<AdminDocumentPrintKind, AdminDocumentPrintMode> =
  {
    sale: "document",
    backorder: "ticket",
  };

function parseAdminDocumentPrintMode(raw: string | null): AdminDocumentPrintMode | null {
  if (raw === "ticket" || raw === "document") return raw;
  return null;
}

export function readAdminDocumentPrintModesFromStorage(): Record<
  AdminDocumentPrintKind,
  AdminDocumentPrintMode
> {
  if (typeof window === "undefined") {
    return { ...DEFAULT_ADMIN_DOCUMENT_PRINT_MODES };
  }
  return {
    sale:
      parseAdminDocumentPrintMode(localStorage.getItem(LS_ADMIN_DOC_PRINT_SALE)) ??
      DEFAULT_ADMIN_DOCUMENT_PRINT_MODES.sale,
    backorder:
      parseAdminDocumentPrintMode(localStorage.getItem(LS_ADMIN_DOC_PRINT_BACKORDER)) ??
      DEFAULT_ADMIN_DOCUMENT_PRINT_MODES.backorder,
  };
}

export function getAdminDocumentPrintMode(kind: AdminDocumentPrintKind): AdminDocumentPrintMode {
  return readAdminDocumentPrintModesFromStorage()[kind];
}

export function writeAdminDocumentPrintModesToStorage(
  modes: Partial<Record<AdminDocumentPrintKind, AdminDocumentPrintMode>>,
): void {
  if (typeof window === "undefined") return;
  const keyByKind: Record<AdminDocumentPrintKind, string> = {
    sale: LS_ADMIN_DOC_PRINT_SALE,
    backorder: LS_ADMIN_DOC_PRINT_BACKORDER,
  };
  let changed = false;
  for (const kind of Object.keys(keyByKind) as AdminDocumentPrintKind[]) {
    const mode = modes[kind];
    if (mode === undefined) continue;
    localStorage.setItem(keyByKind[kind], mode);
    changed = true;
  }
  if (changed && typeof globalThis.window !== "undefined") {
    globalThis.window.dispatchEvent(
      new CustomEvent(ADMIN_DOCUMENT_PRINT_MODES_CHANGED_EVENT),
    );
  }
}

/** Formato de impresión por tipo de documento del POS (ticket 80 mm vs hoja). */
export type PosDocumentPrintMode = "ticket" | "document";

/** Tipos de documento configurables en Impresión local del POS. */
export type PosDocumentPrintKind =
  | "sale"
  | "quotation"
  | "backorder"
  | "customerCreditNote"
  | "cashClosing";

export const POS_DOCUMENT_PRINT_MODES_CHANGED_EVENT = "flowstore:pos-document-print-modes-changed";

const LS_POS_DOC_PRINT_SALE = "printPosDocPrintSale";
const LS_POS_DOC_PRINT_QUOTATION = "printPosDocPrintQuotation";
const LS_POS_DOC_PRINT_BACKORDER = "printPosDocPrintBackorder";
const LS_POS_DOC_PRINT_CUSTOMER_CREDIT_NOTE = "printPosDocPrintCustomerCreditNote";
const LS_POS_DOC_PRINT_CASH_CLOSING = "printPosDocPrintCashClosing";

const DEFAULT_POS_DOCUMENT_PRINT_MODES: Record<PosDocumentPrintKind, PosDocumentPrintMode> = {
  sale: "ticket",
  quotation: "ticket",
  backorder: "ticket",
  customerCreditNote: "ticket",
  cashClosing: "ticket",
};

function parsePosDocumentPrintMode(raw: string | null): PosDocumentPrintMode | null {
  const v = (raw || "").trim().toLowerCase();
  if (v === "ticket" || v === "document") return v;
  return null;
}

export function readPosDocumentPrintModesFromStorage(): Record<PosDocumentPrintKind, PosDocumentPrintMode> {
  if (typeof window === "undefined") {
    return { ...DEFAULT_POS_DOCUMENT_PRINT_MODES };
  }
  return {
    sale:
      parsePosDocumentPrintMode(localStorage.getItem(LS_POS_DOC_PRINT_SALE)) ??
      DEFAULT_POS_DOCUMENT_PRINT_MODES.sale,
    quotation:
      parsePosDocumentPrintMode(localStorage.getItem(LS_POS_DOC_PRINT_QUOTATION)) ??
      DEFAULT_POS_DOCUMENT_PRINT_MODES.quotation,
    backorder:
      parsePosDocumentPrintMode(localStorage.getItem(LS_POS_DOC_PRINT_BACKORDER)) ??
      DEFAULT_POS_DOCUMENT_PRINT_MODES.backorder,
    customerCreditNote:
      parsePosDocumentPrintMode(localStorage.getItem(LS_POS_DOC_PRINT_CUSTOMER_CREDIT_NOTE)) ??
      DEFAULT_POS_DOCUMENT_PRINT_MODES.customerCreditNote,
    cashClosing:
      parsePosDocumentPrintMode(localStorage.getItem(LS_POS_DOC_PRINT_CASH_CLOSING)) ??
      DEFAULT_POS_DOCUMENT_PRINT_MODES.cashClosing,
  };
}

export function getPosDocumentPrintMode(kind: PosDocumentPrintKind): PosDocumentPrintMode {
  return readPosDocumentPrintModesFromStorage()[kind];
}

export function writePosDocumentPrintModesToStorage(
  modes: Partial<Record<PosDocumentPrintKind, PosDocumentPrintMode>>,
): void {
  if (typeof window === "undefined") return;
  const keyByKind: Record<PosDocumentPrintKind, string> = {
    sale: LS_POS_DOC_PRINT_SALE,
    quotation: LS_POS_DOC_PRINT_QUOTATION,
    backorder: LS_POS_DOC_PRINT_BACKORDER,
    customerCreditNote: LS_POS_DOC_PRINT_CUSTOMER_CREDIT_NOTE,
    cashClosing: LS_POS_DOC_PRINT_CASH_CLOSING,
  };
  let changed = false;
  for (const kind of Object.keys(keyByKind) as PosDocumentPrintKind[]) {
    const mode = modes[kind];
    if (mode === undefined) continue;
    localStorage.setItem(keyByKind[kind], mode);
    changed = true;
  }
  if (changed && typeof globalThis.window !== "undefined") {
    globalThis.window.dispatchEvent(new CustomEvent(POS_DOCUMENT_PRINT_MODES_CHANGED_EVENT));
  }
}

/**
 * Añade `printerDisplayLabel` al payload de `print` según el propósito y la elección guardada en el POS.
 * No persiste nada en el agente: solo indica qué línea (alias) usar para este trabajo.
 */
export function mergePrinterDisplayLabelForPurposeIntoPrintExtras(
  purpose: string,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const { ticketsAlias, documentsAlias } = readPosPurposePrinterAliasesFromStorage();
  const p = (purpose || "documents").trim().toLowerCase();
  let lbl = "";
  if (p === "tickets") lbl = ticketsAlias;
  else if (p === "documents") lbl = documentsAlias;
  if (!lbl) return extra;
  return { ...extra, printerDisplayLabel: lbl, printerAlias: lbl };
}

/** Solo páginas HTTPS exigen WSS (mixed content). En `http://localhost` usamos WS salvo que el usuario active «Usar WSS» en el panel. */
export function printServicePageRequiresTls(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export type PrintServiceProbeResult = {
  ok: boolean;
  url: string;
  error?: string;
  /** Tiempo hasta `onopen` (handshake WebSocket listo). */
  latencyMs?: number;
};

/**
 * Comprueba si hay un endpoint WebSocket accesible (handshake completo).
 * Útil en tests, scripts o diagnóstico; no valida el protocolo `hello` del agente.
 */
export function probePrintServiceReachable(options: {
  /** Si se indica, se usa tal cual (p. ej. en tests con puerto efímero). */
  url?: string;
  host?: string;
  port?: number;
  wssPort?: number;
  useTls?: boolean;
  timeoutMs?: number;
} = {}): Promise<PrintServiceProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: PrintServiceProbeResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    const timeoutMs = options.timeoutMs ?? 5000;
    let url: string;
    if (options.url) {
      url = options.url;
    } else {
      const fromLs = typeof window !== "undefined" ? readPrintServiceConfigFromStorage() : null;
      const host = (options.host ?? fromLs?.host ?? "127.0.0.1").trim();
      const pageHttps = typeof window !== "undefined" && printServicePageRequiresTls();
      const useTls = options.useTls ?? (pageHttps || Boolean(fromLs?.useTls));
      const portNum = useTls
        ? (options.wssPort ?? fromLs?.wssPort ?? 14568)
        : (options.port ?? fromLs?.port ?? 14567);
      url = buildWebSocketUrl(host, portNum, useTls);
    }

    const t0 = Date.now();
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
    const clearTimer = () => {
      if (timer != null) {
        globalThis.clearTimeout(timer);
        timer = null;
      }
    };

    const c = new PrintServiceConnection({
      url,
      clientId: "probe",
      onOpen: () => {
        clearTimer();
        finish({ ok: true, url, latencyMs: Date.now() - t0 });
        globalThis.queueMicrotask(() => c.disconnect());
      },
      onError: (msg) => {
        clearTimer();
        finish({ ok: false, url, error: msg });
        c.disconnect({ ifConnecting: "abandon" });
      },
      onClose: () => {
        clearTimer();
      },
    });

    timer = globalThis.setTimeout(() => {
      timer = null;
      c.disconnect({ ifConnecting: "abandon" });
      finish({ ok: false, url, error: "timeout" });
    }, timeoutMs);

    c.connect();
  });
}
