import { Suspense } from "react";
import VariantScannerPage from "@/features/variant/components/VariantScannerPage";
import PageLoading from "@/shared/components/PageLoading";

export const dynamic = "force-dynamic";

export default function VariantPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VariantScannerPage />
    </Suspense>
  );
}
