import { StorePageShell } from "@/shared/components/StorePageShell";
import { CheckoutForm } from "./CheckoutForm";

export default function CheckoutPage() {
  return (
    <StorePageShell>
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <CheckoutForm />
      </div>
    </StorePageShell>
  );
}
