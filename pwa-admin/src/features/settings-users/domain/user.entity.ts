import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "OPERATOR"]);

export const CreateUserFormSchema = z.object({
  userName: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(100),
  mail: z.string().min(1, "El correo es obligatorio").email("Correo no válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(200),
  rol: roleSchema.default("OPERATOR"),
});

export type CreateUserFormInput = z.infer<typeof CreateUserFormSchema>;

export const UpdateUserFormSchema = z.object({
  id: z.string().uuid("Identificador de usuario no válido"),
  userName: z.string().min(3, "El usuario debe tener al menos 3 caracteres").max(100),
  mail: z.string().min(1, "El correo es obligatorio").email("Correo no válido"),
  rol: roleSchema,
  personName: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  personDni: z.string().max(50).optional().nullable(),
});

export type UpdateUserFormInput = z.infer<typeof UpdateUserFormSchema>;
