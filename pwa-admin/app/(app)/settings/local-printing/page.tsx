import { AdminLocalPrintingSettingsForm } from "./AdminLocalPrintingSettingsForm";

export default function LocalPrintingSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Impresión local</h1>
      <AdminLocalPrintingSettingsForm />
    </div>
  );
}
