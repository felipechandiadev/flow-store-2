import { getCatalogProductAction } from "@/features/e-shop-storefront/actions/storefront.action";
import { StorePageShell } from "@/shared/components/StorePageShell";
import { EShopProductDetailView } from "@/shared/components/EShopProductDetailView";

export default async function CatalogProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { productId } = await params;
  const { variant } = await searchParams;
  const detail = await getCatalogProductAction(productId);

  return (
    <StorePageShell>
      <EShopProductDetailView detail={detail} initialVariantId={variant ?? null} />
    </StorePageShell>
  );
}
