import { z } from "zod";

export const OpenCashSessionSchema = z.object({
  pointOfSaleId: z.string().uuid(),
  openingAmount: z.coerce.number().min(0),
});

export type OpenCashSessionInput = z.input<typeof OpenCashSessionSchema>;
export type OpenCashSessionData = z.output<typeof OpenCashSessionSchema>;

