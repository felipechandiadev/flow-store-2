import { EShopHeroSlider } from "@/shared/components/EShopHeroSlider";
import { EShopProductCard } from "@/shared/components/EShopProductCard";
import { StorePageShell } from "@/shared/components/StorePageShell";
import {
  getFeaturedProductsAction,
  getHeroSlidesAction,
  getTestimonialsAction,
  getBranchesAction,
} from "@/features/e-shop-storefront/actions/storefront.action";
import Link from "next/link";
import { BranchesMap } from "./ui/BranchesMap";
import { TestimonialCard } from "./ui/TestimonialCard";

export default async function HomePage() {
  const [hero, featured, testimonials, branches] = await Promise.all([
    getHeroSlidesAction(),
    getFeaturedProductsAction(),
    getTestimonialsAction(),
    getBranchesAction(),
  ]);

  return (
    <>
      <EShopHeroSlider slides={hero.slides} autoplaySeconds={hero.autoplaySeconds} />

      <StorePageShell className="space-y-16">
        <section id="productos" className="scroll-mt-20 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold">Productos destacados</h2>
            <Link href="/productos" className="text-sm text-primary hover:underline">
              Ver catálogo completo
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.items.map((p) => (
              <EShopProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        <section id="testimonios" className="scroll-mt-20 space-y-6">
          <h2 className="text-xl font-semibold">Qué dicen nuestros clientes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        </section>

        <section id="donde-estamos" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold">Encuéntranos</h2>
          <BranchesMap branches={branches} />
          <Link href="/donde-estamos" className="text-sm text-primary hover:underline">
            Ver mapa y sucursales
          </Link>
        </section>
      </StorePageShell>
    </>
  );
}
