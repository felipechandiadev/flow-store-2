import { z } from "zod";

export const quickCreateProductInputSchema = z.object({
  productName: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  scannedCode: z.string().trim().min(1, "Código inválido").max(100),
  mode: z.enum(["barcode", "sku"]),
  sku: z.string().trim().max(100).optional(),
  basePrice: z.coerce.number().min(0).optional(),
  baseCost: z.coerce.number().min(0).optional(),
});

export type QuickCreateProductInput = z.infer<typeof quickCreateProductInputSchema>;
