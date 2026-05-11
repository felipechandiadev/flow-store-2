import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { listSuperAdminsAction } from "@/features/settings-users/actions/super-admin.action";
import { SuperAdminsCollection } from "../components/SuperAdminsCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [session, res] = await Promise.all([
    getServerSession(authOptions),
    listSuperAdminsAction(),
  ]);
  const items = res.success ? res.items : [];
  const error = res.success ? null : res.error;
  const currentUserId = (session?.user as any)?.id ?? null;

  return (
    <div className="min-h-0" data-test-id="super-admins-page-root">
      <Suspense
        fallback={
          <div
            className="p-4 text-sm text-muted md:p-6"
            data-test-id="super-admins-page-skeleton"
          >
            Cargando…
          </div>
        }
      >
        <SuperAdminsCollection
          initialItems={items}
          currentUserId={currentUserId}
        />
      </Suspense>
      {error ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="super-admins-page-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
