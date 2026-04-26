import { CollectionPageLayoutShowcaseClient } from "./CollectionPageLayoutShowcaseClient";
import { SearchQueryServerPreview } from "./SearchQueryServerPreview";
import { UrlSearchLive } from "./UrlSearchLive";
import { Suspense } from "react";

export default async function CollectionPageLayoutShowcasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const searchRaw = sp.search;
  const searchFromUrl = typeof searchRaw === "string" ? searchRaw : "";

  return (
    <div className="p-4 md:p-6">
      <CollectionPageLayoutShowcaseClient
        contentGridColumns={{ default: 1, md: 2, lg: 2 }}
        contentItems={[
          <SearchQueryServerPreview key="server-preview" searchFromUrl={searchFromUrl} />,
          <Suspense
            key="url-client"
            fallback={
              <p className="text-sm text-muted" data-test-id="url-search-live-skeleton">
                Cargando reflejo de la URL…
              </p>
            }
          >
            <UrlSearchLive paramName="search" />
          </Suspense>,
        ]}
      />
    </div>
  );
}
