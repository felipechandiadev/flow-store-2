import { BasicPageLayout } from "@/shared/components/layouts/BasicPageLayout";
import { TestimonialsAdminPanel } from "./ui/TestimonialsAdminPanel";
import { listTestimonialsAction } from "@/features/e-shop-testimonials/actions/testimonial.action";

export const dynamic = "force-dynamic";

export default async function EShopTestimonialsPage() {
  const items = await listTestimonialsAction();
  return (
    <BasicPageLayout title="Testimonios eShop" subtitle="Reseñas mostradas en la tienda pública">
      <TestimonialsAdminPanel initialItems={items} />
    </BasicPageLayout>
  );
}
