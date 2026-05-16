import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import { probePrintServiceReachable } from "./core";

describe("probePrintServiceReachable", () => {
  let wss: WebSocketServer;
  let port: number;

  beforeAll(
    () =>
      new Promise<void>((resolve, reject) => {
        wss = new WebSocketServer({ host: "127.0.0.1", port: 0 }, () => {
          const addr = wss.address();
          if (addr && typeof addr === "object") {
            port = (addr as AddressInfo).port;
            resolve();
          } else {
            reject(new Error("no address"));
          }
        });
        wss.on("connection", (socket) => {
          socket.on("message", () => {
            /* echo opcional: el probe solo necesita handshake */
          });
        });
        wss.on("error", reject);
      }),
  );

  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        wss.close((err) => (err ? reject(err) : resolve()));
      }),
  );

  it("detecta un servidor WebSocket local (mock)", async () => {
    const url = `ws://127.0.0.1:${port}`;
    const r = await probePrintServiceReachable({ url, timeoutMs: 3000 });
    expect(r.ok).toBe(true);
    expect(r.url).toBe(url);
    expect(r.latencyMs).toBeDefined();
    expect(r.latencyMs!).toBeGreaterThanOrEqual(0);
    expect(r.latencyMs!).toBeLessThan(3000);
  });

  it("falla con timeout si el puerto no escucha", async () => {
    const url = "ws://127.0.0.1:1";
    const r = await probePrintServiceReachable({ url, timeoutMs: 400 });
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });
});

describe("Agente KaiPrinters local (opcional)", () => {
  /**
   * `probePrintServiceReachable` usa `WebSocket` global: en Node (Vitest) no manda `Origin`
   * y el agente Tauri rechaza el handshake (403). Aquí usamos `ws` con Origin de PWA típica.
   */
  it.skipIf(process.env.LIVE_PRINT_AGENT !== "1")(
    "ws://127.0.0.1:14567 con Origin (como el navegador del POS)",
    async () => {
      const origin = process.env.LIVE_PRINT_ORIGIN ?? "http://localhost:3022";
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket("ws://127.0.0.1:14567", { origin });
        const t = setTimeout(() => {
          ws.terminate();
          reject(new Error("timeout: ¿KaiPrinters en marcha y puerto 14567?"));
        }, 8000);
        ws.once("open", () => {
          clearTimeout(t);
          ws.close(1000);
          resolve();
        });
        ws.once("error", (err) => {
          clearTimeout(t);
          reject(err);
        });
      });
    },
  );
});
