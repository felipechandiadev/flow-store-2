import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";
import ReceptionNewPageContent from "./ReceptionNewPageContent";

export const dynamic = "force-dynamic";

function ReceptionNewFallback() {
  return (
    <div className="min-h-0 min-w-0 p-3 text-sm text-muted-foreground" data-test-id="receptions-new-skeleton">
      Cargando búsqueda…
    </div>
  );
}

export default async function NewReceptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  noStore();

  return (
    <Suspense fallback={<ReceptionNewFallback />}>
      <ReceptionNewPageContent searchParams={searchParams} />
    </Suspense>
  );
}
