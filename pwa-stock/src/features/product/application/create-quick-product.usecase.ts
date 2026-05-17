import { CatalogRequest } from "../infrastructure/catalog.request";
import { ProductRequest } from "../infrastructure/product.request";
import {
  buildInitialSku,
  effectiveIvaFactor,
  grossToNet,
  roundMoneyInt,
} from "../domain/price-tax";
import {
  quickCreateProductInputSchema,
  type QuickCreateProductInput,
} from "../domain/quick-create-product.entity";

export type CreateQuickProductResult =
  | { ok: true; variantId: string; sku: string }
  | { ok: false; error: string };

export async function createQuickProductUseCase(
  input: QuickCreateProductInput,
): Promise<CreateQuickProductResult> {
  const parsed = quickCreateProductInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { productName, scannedCode, mode, sku: skuInput, basePrice, baseCost } = parsed.data;

  const catalog = await CatalogRequest.resolveDefaults();
  if (!catalog.success) {
    return { ok: false, error: catalog.error };
  }
  const { unitId, priceListId, defaultIvaTaxIds, taxes } = catalog.defaults;

  const productRes = await ProductRequest.createProduct(productName);
  if (!productRes.success) {
    return { ok: false, error: productRes.error };
  }

  const sku =
    skuInput?.trim() ||
    (mode === "sku" ? scannedCode : buildInitialSku(productName, productRes.id));

  const gross = roundMoneyInt(basePrice ?? 0);
  const factor = effectiveIvaFactor(taxes, defaultIvaTaxIds);
  const net = grossToNet(gross, factor);

  const variantRes = await ProductRequest.createVariant({
    productId: productRes.id,
    sku,
    barcode: mode === "barcode" ? scannedCode : null,
    basePrice: net,
    unitId,
    pmp: roundMoneyInt(baseCost ?? 0),
    priceListItems: [
      {
        priceListId,
        netPrice: net,
        grossPrice: gross,
        taxIds: defaultIvaTaxIds.length > 0 ? defaultIvaTaxIds : undefined,
      },
    ],
  });

  if (!variantRes.success) {
    return { ok: false, error: variantRes.error };
  }

  return { ok: true, variantId: variantRes.id, sku };
}
