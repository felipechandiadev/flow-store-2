"use client";

import { useEffect, useRef } from "react";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";

/** Vacía el carrito solo al llegar a confirmación con un pedido registrado. */
export function ClearCartOnOrderSuccess({ documentNumber }: { documentNumber?: string }) {
  const { clearCart } = useEShopCart();
  const cleared = useRef(false);

  useEffect(() => {
    if (!documentNumber?.trim() || cleared.current) return;
    cleared.current = true;
    clearCart();
  }, [documentNumber, clearCart]);

  return null;
}
