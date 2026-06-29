import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"], {
    message: "Role must be 'USER' or 'ADMIN'",
  }),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
