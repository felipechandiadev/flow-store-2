import { Suspense } from "react";
import { listUsersForSettingsPage } from "@/features/settings-users/actions/user.action";
import { SettingsUsersCollection } from "./components/SettingsUsersCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const users = await listUsersForSettingsPage();

  return (
    <Suspense
      fallback={
        <div
          className="p-4 text-sm text-muted md:p-6"
          data-test-id="users-page-skeleton"
        >
          Cargando…
        </div>
      }
    >
      <SettingsUsersCollection initialUsers={users} />
    </Suspense>
  );
}
