import { Suspense } from "react";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { SettingsBranchesCollection } from "./components/SettingsBranchesCollection";

/** Lista desde servidor en cada carga: necesario para que revalidate + router.refresh muestren cambios. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const branches = await listBranchesForSettingsPage();

  return (
    <Suspense
      fallback={
        <div
          className="p-4 text-sm text-muted md:p-6"
          data-test-id="branches-page-skeleton"
        >
          Cargando…
        </div>
      }
    >
      <SettingsBranchesCollection initialBranches={branches} />
    </Suspense>
  );
}
