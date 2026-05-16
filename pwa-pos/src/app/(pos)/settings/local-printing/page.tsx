import Link from "next/link";
import { PosLocalPrintPreferencesForm } from "@flowstore/print-service-client";

export default function PosLocalPrintingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <div>
        <p className="mb-2 text-sm">
          <Link href="/" className="text-accent underline-offset-2 hover:underline">
            ← Volver al punto de venta
          </Link>
        </p>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          Impresión local
        </h1>
      </div>
      <PosLocalPrintPreferencesForm />
    </div>
  );
}
