import { PosLocalPrintPreferencesForm } from "./PosLocalPrintPreferencesForm";

export default function PosLocalPrintingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
      <h1
        className="text-xl font-semibold tracking-tight"
        style={{ color: "var(--color-foreground)" }}
      >
        Impresión local
      </h1>
      <PosLocalPrintPreferencesForm />
    </div>
  );
}
