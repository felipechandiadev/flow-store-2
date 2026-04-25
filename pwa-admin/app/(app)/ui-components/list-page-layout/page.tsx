import { ListPageLayoutShowcaseClient } from "./ListPageLayoutShowcaseClient";
import { SearchQueryServerPreview } from "./SearchQueryServerPreview";
import { UrlSearchLive } from "./UrlSearchLive";
import { Suspense } from "react";

export default async function ListPageLayoutShowcasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const searchRaw = sp.search;
  const searchFromUrl = typeof searchRaw === "string" ? searchRaw : "";

  return (
    <div className="p-4 md:p-6">
      <ListPageLayoutShowcaseClient>
        <div className="grid gap-4 md:grid-cols-1 lg:max-w-4xl">
          <SearchQueryServerPreview searchFromUrl={searchFromUrl} />
          <Suspense
            fallback={
              <p className="text-sm text-muted" data-test-id="url-search-live-skeleton">
                Cargando reflejo de la URL…
              </p>
            }
          >
            <UrlSearchLive paramName="search" />
          </Suspense>
        </div>
      </ListPageLayoutShowcaseClient>
    </div>
  );
}
