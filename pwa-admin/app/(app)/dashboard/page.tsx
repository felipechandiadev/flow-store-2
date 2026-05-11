import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { DashboardPanel } from "./ui/DashboardPanel";

export default function DashboardPage() {
  return (
    <BasicPageLayout
      title="Panel"
      subtitle="Resumen consolidado del negocio. Las métricas mostradas son simuladas hasta conectar los agregados en vivo."
      data-test-id="dashboard-page"
    >
      <DashboardPanel />
    </BasicPageLayout>
  );
}
