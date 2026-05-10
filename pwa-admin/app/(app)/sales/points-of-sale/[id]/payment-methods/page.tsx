import { notFound } from "next/navigation";
import { CompaniesPaymentMethodsRequest } from "@/features/companies/infrastructure/companies-payment-methods.request";
import { PointOfSaleRequest } from "@/features/sales-points-of-sale/infrastructure/point-of-sale.request";
import { getPosPaymentMethodsAction } from "@/features/sales-points-of-sale/actions/pos-payment-methods.action";
import { PosPaymentMethodsEditor } from "./components/PosPaymentMethodsEditor";

export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

export default async function Page({ params }: PageProps) {
  const id = params.id;

  const list = await PointOfSaleRequest.findAll(true);
  if (!list.success) {
    notFound();
  }
  const point = list.pointsOfSale.find((p) => p.id === id);
  if (!point) {
    notFound();
  }

  const [posMethodsRes, catalogRes] = await Promise.all([
    getPosPaymentMethodsAction(id),
    point.companyId
      ? CompaniesPaymentMethodsRequest.list(point.companyId)
      : Promise.resolve({
          success: false as const,
          error: "Empresa no determinada para este POS",
        }),
  ]);

  return (
    <PosPaymentMethodsEditor
      posId={id}
      posLabel={point.name}
      initialCatalog={catalogRes.success ? catalogRes.paymentMethods : []}
      initialPosList={
        posMethodsRes.success ? posMethodsRes.paymentMethods : []
      }
      initialError={
        catalogRes.success && posMethodsRes.success
          ? null
          : (catalogRes as any).error || (posMethodsRes as any).error || null
      }
    />
  );
}
