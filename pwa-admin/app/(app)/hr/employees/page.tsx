import { Suspense } from "react";
import { listEmployeesForGridAction } from "@/features/hr-employees/actions/employee.action";
import EmployeesDataGrid from "./ui/EmployeesDataGrid";

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const t = parseSp(sp, "includeTerminated");
  const includeTerminated = t === "1" || t === "true";

  const rows = await listEmployeesForGridAction({ includeTerminated });

  return (
    <div className="min-h-0 p-0" data-test-id="hr-employees-page-root">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground" data-test-id="employees-page-skeleton">
            Cargando…
          </div>
        }
      >
        <EmployeesDataGrid rows={rows} includeTerminated={includeTerminated} />
      </Suspense>
    </div>
  );
}
