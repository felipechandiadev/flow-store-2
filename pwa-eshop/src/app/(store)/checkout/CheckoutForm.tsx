"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@/shared/admin-shared";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import { submitCheckoutAction } from "@/features/e-shop-checkout/actions/checkout.action";

export function CheckoutForm() {
  const router = useRouter();
  const { lines } = useEShopCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await submitCheckoutAction({
        customerName: name,
        customerEmail: email,
        customerPhone: phone || undefined,
        address: address || undefined,
        lines: lines.map((l) => ({
          productVariantId: l.productVariantId,
          quantity: l.quantity,
        })),
      });
      router.push(`/checkout/confirmacion?doc=${encodeURIComponent(result.documentNumber)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al confirmar pedido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
      <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <TextField label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <TextField label="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy || lines.length === 0} className="w-full min-h-[44px]">
        {busy ? "Procesando…" : "Confirmar pedido"}
      </Button>
    </form>
  );
}
