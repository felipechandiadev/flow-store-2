import {
  getFeaturedProductsAction,
  getProductsAction,
} from "@/features/e-shop-storefront/actions/storefront.action";
import type { EShopProductCard as Product } from "@/features/e-shop-storefront/types/storefront.types";
import { EShopProductCard } from "@/shared/components/EShopProductCard";
import { StorePageShell } from "@/shared/components/StorePageShell";

function ProductGrid({ items }: { items: Product[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay productos para mostrar.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((p) => (
        <EShopProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const [{ items: featured }, { items: catalog }] = await Promise.all([
    getFeaturedProductsAction(),
    getProductsAction({ search }),
  ]);

  const featuredIds = new Set(featured.map((p) => p.id));
  const catalogItems = catalog.filter((p) => !featuredIds.has(p.id));
  const showFeatured = !search?.trim() && featured.length > 0;

  return (
    <StorePageShell className="space-y-12">
      <h1 className="text-2xl font-semibold">Productos</h1>

      {showFeatured ? (
        <section id="destacados" className="scroll-mt-20 space-y-6">
          <h2 className="text-xl font-semibold">Destacados</h2>
          <ProductGrid items={featured} />
        </section>
      ) : null}

      <section id="catalogo" className="scroll-mt-20 space-y-6">
        <h2 className="text-xl font-semibold">
          {showFeatured ? "Catálogo completo" : search?.trim() ? "Resultados" : "Catálogo completo"}
        </h2>
        <ProductGrid items={showFeatured ? catalogItems : catalog} />
      </section>
    </StorePageShell>
  );
}
