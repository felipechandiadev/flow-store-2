"use client";

import { useRouter } from "next/navigation";
import { IconButton } from "@/shared/admin-shared";
import { PosLocalPrintPreferencesForm } from "./PosLocalPrintPreferencesForm";

export default function PosLocalPrintingPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            Impresión local
          </h1>
        </div>
        <IconButton
          icon="ArrowLeft"
          variant="ghost"
          size="md"
          ariaLabel="Volver al punto de venta"
          title="Volver al punto de venta"
          onClick={() => router.push("/pos")}
          data-test-id="local-printing-back-pos"
        />
      </div>
      <PosLocalPrintPreferencesForm />
    </div>
  );
}
