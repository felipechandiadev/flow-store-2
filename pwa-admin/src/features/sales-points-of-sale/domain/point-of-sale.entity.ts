import { z } from "zod";

/** Input del formulario (UI). `code` se envía al backend como `deviceId` si existe. */
/** Exportado para use cases (safeParse). */
export const CreatePointOfSaleFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  code: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreatePointOfSaleFormInput = z.infer<typeof CreatePointOfSaleFormSchema>;

export class PointOfSaleEntity {
  static validateCreateForm(data: unknown): CreatePointOfSaleFormInput {
    return CreatePointOfSaleFormSchema.parse(data);
  }
}
