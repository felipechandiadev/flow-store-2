import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

/**
 * Enriquece cada variante con multimedia por atributo (`product-variant` + `attributeId`).
 * No hay galería general en variantes.
 */
export async function attachProductVariantMultimedia(
  multimediaService: MultimediaServiceAdapter,
  variantsByProduct: Record<string, Array<Record<string, unknown>>>,
  variantIds: string[],
): Promise<void> {
  if (variantIds.length === 0) {
    return;
  }
  const mediaByVariantId = await multimediaService.listByEntityIds(
    'product-variant',
    variantIds,
    undefined,
    'all',
  );

  for (const pid of Object.keys(variantsByProduct)) {
    variantsByProduct[pid] = variantsByProduct[pid].map((row) => {
      const id = row.id != null ? String(row.id) : '';
      const assets = id ? mediaByVariantId[id] ?? [] : [];
      return {
        ...row,
        primaryImageUrl: null,
        mediaAssets: assets.map((a) => ({
          id: a.id,
          publicUrl: a.publicUrl,
          mimeType: a.mimeType,
          kind: a.kind,
          isPrimary: (a as { isPrimary?: boolean }).isPrimary === true,
        })),
      };
    });
  }
}
