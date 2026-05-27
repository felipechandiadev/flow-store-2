import { toLatinSearchPattern } from '@common/text/fold-latin-search-text';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export type ProductCatalogSearchAliases = {
  product?: string;
};

/**
 * Filtro de texto para catálogo: nombre, marca (texto o catálogo), SKU y barcode de variantes.
 * Insensible a mayúsculas (ILIKE) y tildes (`unaccent` en columnas + término plegado en app).
 */
export function applyProductCatalogTextSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: string | undefined,
  aliases: ProductCatalogSearchAliases = {},
): void {
  const pattern = toLatinSearchPattern(search ?? '');
  if (!pattern) return;

  const productAlias = aliases.product ?? 'p';

  const catalogBrandJoined = qb.expressionMap.joinAttributes.some(
    (j) => j.alias?.name === 'catalogBrand',
  );
  if (!catalogBrandJoined) {
    qb.leftJoin(`${productAlias}.catalogBrand`, 'catalogBrand');
  }

  qb.andWhere(
    `(
      public.unaccent(COALESCE(${productAlias}.name, '')) ILIKE :productCatalogSearchQ
      OR public.unaccent(COALESCE(${productAlias}.brand, '')) ILIKE :productCatalogSearchQ
      OR public.unaccent(COALESCE(catalogBrand.name, '')) ILIKE :productCatalogSearchQ
      OR EXISTS (
        SELECT 1 FROM product_variants pv_search
        WHERE pv_search.product_id = ${productAlias}.id
          AND pv_search.deleted_at IS NULL
          AND (
            public.unaccent(COALESCE(pv_search.sku, '')) ILIKE :productCatalogSearchQ
            OR public.unaccent(COALESCE(pv_search.barcode, '')) ILIKE :productCatalogSearchQ
          )
      )
    )`,
    { productCatalogSearchQ: pattern },
  );
}
