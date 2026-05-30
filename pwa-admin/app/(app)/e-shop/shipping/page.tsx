import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { ShippingPlaceholderPanel } from "./ui/ShippingPlaceholderPanel";

export default function EShopShippingPage() {
  return (
    <BasicPageLayout
      title="Envíos eShop"
      subtitle="Módulo de envío propio — diseño en curso (distancia, combustible, zonas)"
    >
      <ShippingPlaceholderPanel />
    </BasicPageLayout>
  );
}
