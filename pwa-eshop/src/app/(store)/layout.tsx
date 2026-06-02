import { notFound } from "next/navigation";
import { EShopCartProvider } from "@/features/e-shop-cart/EShopCartProvider";
import { getStorefrontAction } from "@/features/e-shop-storefront/actions/storefront.action";
import { EShopApiError } from "@/features/e-shop-storefront/infrastructure/eshop-api-error";
import { EShopTopBar } from "@/shared/components/EShopTopBar";
import { EShopCartDrawer } from "@/shared/components/EShopCartDrawer";
import { EShopFooter } from "@/shared/components/EShopFooter";
import { EShopStoreUnavailable } from "@/shared/components/EShopStoreUnavailable";
import { LegacyHashRedirect } from "./ui/LegacyHashRedirect";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let storefront;
  try {
    storefront = await getStorefrontAction();
  } catch (e) {
    if (e instanceof EShopApiError) {
      if (e.status === 503) {
        return <EShopStoreUnavailable reason="disabled" />;
      }
      if (e.status === 404) {
        return <EShopStoreUnavailable reason="not_found" />;
      }
    }
    throw e;
  }

  return (
    <EShopCartProvider initialFreeShippingThreshold={storefront.eShopFreeShippingThreshold}>
      <LegacyHashRedirect />
      <EShopTopBar
        companyName={storefront.companyName}
        companyLogoUrl={storefront.companyLogoUrl}
      />
      <main className="w-full flex-1">{children}</main>
      <EShopFooter storefront={storefront} />
      <EShopCartDrawer />
    </EShopCartProvider>
  );
}
