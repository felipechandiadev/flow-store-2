"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import type { StockUpdatedPayload } from "../lib/stock-alert-copy";

export type { StockUpdatedPayload };

type StockRealtimeContextValue = {
  stockAlertCount: number;
  lastStockEvents: Array<StockUpdatedPayload & { receivedAt?: number }>;
  clearStockAlerts: () => void;
};

const StockRealtimeContext = createContext<StockRealtimeContextValue>({
  stockAlertCount: 0,
  lastStockEvents: [],
  clearStockAlerts: () => {},
});

export function useStockRealtime() {
  return useContext(StockRealtimeContext);
}

function clientBackendBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  if (!raw || !String(raw).trim()) {
    return null;
  }
  return String(raw).replace(/\/$/, "");
}

export function PosStockRealtimeProvider({
  children,
  userId,
  activeCompanyId,
}: {
  children: React.ReactNode;
  /** Mismo esquema que el backend: `Bearer` = id de usuario (ver sesión POS). */
  userId: string | null;
  activeCompanyId?: string | null;
}) {
  const [lastStockEvents, setLastStockEvents] = useState<
    Array<StockUpdatedPayload & { receivedAt?: number }>
  >([]);
  const socketRef = useRef<Socket | null>(null);

  const clearStockAlerts = useCallback(() => {
    setLastStockEvents([]);
  }, []);

  useEffect(() => {
    const base = clientBackendBaseUrl();
    if (!base || !userId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const ctx = readPosContextClient();
        const storageId = ctx?.storageId != null ? String(ctx.storageId).trim() : "";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        };
        if (activeCompanyId) {
          headers["X-Active-Company-Id"] = activeCompanyId;
        }
        const q = storageId ? `?storageId=${encodeURIComponent(storageId)}` : "";
        const res = await fetch(`${base}/api/inventory/threshold-alerts${q}`, { headers });
        if (!res.ok || cancelled) {
          return;
        }
        const json = (await res.json()) as { items?: StockUpdatedPayload[] };
        const items = Array.isArray(json?.items) ? json.items : [];
        const now = Date.now();
        const rows = items.map((p) => ({ ...p, receivedAt: now }));
        setLastStockEvents(rows);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, activeCompanyId]);

  useEffect(() => {
    const base = clientBackendBaseUrl();
    if (!base || !userId) {
      return;
    }

    const socket = io(`${base}/realtime/stock`, {
      transports: ["websocket"],
      auth: {
        userId,
        activeCompanyId: activeCompanyId ?? null,
      },
    });
    socketRef.current = socket;

    const subscribePosStorage = () => {
      const ctx = readPosContextClient();
      const sid = ctx?.storageId != null ? String(ctx.storageId).trim() : "";
      const storageIds = sid ? [sid] : [];
      socket.emit("subscribeStorages", { storageIds });
    };

    const onConnect = () => {
      subscribePosStorage();
    };

    const onStockUpdated = (payload: StockUpdatedPayload) => {
      const row: StockUpdatedPayload & { receivedAt: number } = {
        ...payload,
        receivedAt: Date.now(),
      };
      setLastStockEvents((prev) => [row, ...prev].slice(0, 50));
    };

    socket.on("connect", onConnect);
    socket.on("stock:updated", onStockUpdated);

    const onFocus = () => subscribePosStorage();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      socket.off("connect", onConnect);
      socket.off("stock:updated", onStockUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, activeCompanyId]);

  const value = useMemo(
    () => ({
      stockAlertCount: lastStockEvents.filter((e) => Array.isArray(e.alerts) && e.alerts.length > 0).length,
      lastStockEvents,
      clearStockAlerts,
    }),
    [lastStockEvents, clearStockAlerts],
  );

  return <StockRealtimeContext.Provider value={value}>{children}</StockRealtimeContext.Provider>;
}
