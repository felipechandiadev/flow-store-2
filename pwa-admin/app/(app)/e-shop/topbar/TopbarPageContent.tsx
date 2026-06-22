import { unstable_noStore as noStore } from "next/cache";
import { getEShopThemeAction } from "@/features/e-shop-appearance/actions/eshop-theme.action";
import { getEShopTopBarAction } from "@/features/e-shop-topbar/actions/eshop-topbar.action";
import { EShopTopBarAdminForm } from "@/features/e-shop-topbar/ui/EShopTopBarAdminForm";

type Props = {
  companyId: string;
  companyName: string;
};

export default async function TopbarPageContent({ companyId, companyName }: Props) {
  noStore();
  const [initial, themeState] = await Promise.all([
    getEShopTopBarAction(companyId),
    getEShopThemeAction(companyId),
  ]);
  return (
    <EShopTopBarAdminForm
      companyId={companyId}
      companyName={companyName}
      themeResolved={themeState.resolved}
      initial={initial}
    />
  );
}
