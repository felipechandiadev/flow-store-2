import { Suspense } from "react";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import { listBranchesForSettingsPage } from "@/features/settings-branches/actions/branch.action";
import { StoragesCollection } from "./components/StoragesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [initialStorages, branches] = await Promise.all([listStoragesForPage(), listBranchesForSettingsPage()]);

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="storages-page-skeleton">
          Cargando…
        </div>
      }
    >
      <StoragesCollection initialStorages={initialStorages} branches={branches} />
    </Suspense>
  );
}
