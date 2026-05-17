import { Suspense } from "react";
import SearchPage from "@/features/variant/components/SearchPage";
import PageLoading from "@/shared/components/PageLoading";

export const dynamic = "force-dynamic";

export default function SearchRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SearchPage />
    </Suspense>
  );
}
