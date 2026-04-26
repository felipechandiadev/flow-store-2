import { CreatePointOfSaleFormSchema } from "../domain/point-of-sale.entity";
import { PointOfSaleRequest } from "../infrastructure/point-of-sale.request";
import type { CreatePointOfSaleResult } from "../types/point-of-sale.types";

export class CreatePointOfSaleUseCase {
  static async execute(input: unknown): Promise<CreatePointOfSaleResult> {
    const parsed = CreatePointOfSaleFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    // Notas: aún no hay campo en el API; se reservan en el formulario (UX / futuro en backend).
    return PointOfSaleRequest.create({
      name: d.name,
      deviceId: d.code?.trim() || null,
    });
  }
}
