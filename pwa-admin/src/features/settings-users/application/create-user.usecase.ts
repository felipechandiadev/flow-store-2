import { CreateUserFormSchema } from "../domain/user.entity";
import { UserRequest } from "../infrastructure/user.request";
import type { CreateUserResult } from "../types/user.types";

export class CreateUserUseCase {
  static async execute(input: unknown): Promise<CreateUserResult> {
    const parsed = CreateUserFormSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Datos no válidos";
      return { success: false, error: msg };
    }
    const d = parsed.data;
    return UserRequest.create({
      userName: d.userName,
      mail: d.mail,
      password: d.password,
      rol: d.rol,
    });
  }
}
