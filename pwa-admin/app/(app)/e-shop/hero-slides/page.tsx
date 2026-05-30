import { Suspense } from "react";
import { listHeroSlidesAction } from "@/features/e-shop-hero-slides/actions/hero-slide.action";
import { HeroSlidesCollection } from "./components/HeroSlidesCollection";

export const dynamic = "force-dynamic";

export default async function EShopHeroSlidesPage() {
  const initialSlides = await listHeroSlidesAction();

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="hero-slides-page-skeleton">
          Cargando…
        </div>
      }
    >
      <HeroSlidesCollection initialSlides={initialSlides} />
    </Suspense>
  );
}
