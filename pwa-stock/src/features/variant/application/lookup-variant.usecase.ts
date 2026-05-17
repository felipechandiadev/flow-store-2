import { lookupCodeInputSchema } from "../domain/lookup-code.entity";
import { VariantRequest } from "../infrastructure/variant.request";
import type { VariantLookupItem } from "../types/variant.types";

export type LookupVariantResult =
  | { ok: true; items: VariantLookupItem[] }
  | { ok: false; error: string };

export async function lookupVariantUseCase(input: {
  code: string;
  mode: "barcode" | "sku";
}): Promise<LookupVariantResult> {
  const parsed = lookupCodeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { code, mode } = parsed.data;
  const res = await VariantRequest.lookupByCode(code, mode);
  if (!res.success) {
    return { ok: false, error: res.error };
  }
  return { ok: true, items: res.items };
}
