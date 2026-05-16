import Link from "next/link";
import { LocalPrintingSettingsForm } from "@flowstore/print-service-client";

export default function LocalPrintingSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div>
        <p className="mb-2 text-sm">
          <Link href="/dashboard" className="text-primary underline-offset-2 hover:underline">
            ← Volver al panel
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Impresión local</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Conecte el navegador al agente FlowStore Print Service (Tauri) en esta máquina. Guarde host,
          puertos y token en este navegador; el indicador de la barra superior usa la misma
          configuración.
        </p>
      </div>
      <LocalPrintingSettingsForm />
    </div>
  );
}
