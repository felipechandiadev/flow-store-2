import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { TransactionTypesTable } from "./ui/TransactionTypesTable";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <BasicPageLayout
      title="Transacciones soportadas"
      subtitle="Listado de tipos de transacción (eventos) que el sistema soporta."
      data-test-id="accounting-transaction-types-page"
    >
      <TransactionTypesTable />
    </BasicPageLayout>
  );
}

