import { unstable_noStore as noStore } from "next/cache";
import { getEShopFooterAction } from "@/features/e-shop-footer/actions/eshop-footer.action";
import { EShopFooterAdminForm } from "@/features/e-shop-footer/ui/EShopFooterAdminForm";

type Props = {
  companyId: string;
  companyName: string;
};

export default async function FooterPageContent({ companyId, companyName }: Props) {
  noStore();
  const initial = await getEShopFooterAction(companyId);
  return (
    <EShopFooterAdminForm
      companyId={companyId}
      companyName={companyName}
      initial={initial}
    />
  );
}
