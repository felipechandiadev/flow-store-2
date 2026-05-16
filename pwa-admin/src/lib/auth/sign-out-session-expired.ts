"use client";

import { signOut } from "next-auth/react";

let inFlight: Promise<void> | null = null;

/**
 * Cierra sesión NextAuth y envía al login (`/`). Idempotente / con debounce
 * para no disparar varias veces si WS y HTTP fallan a la vez.
 */
export function signOutSessionExpired(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (inFlight) {
    return;
  }
  inFlight = (async () => {
    try {
      await signOut({ callbackUrl: "/", redirect: true });
    } catch {
      window.location.assign("/");
    } finally {
      inFlight = null;
    }
  })();
}

export function isUnauthorizedResponse(res: Response): boolean {
  return res.status === 401;
}
