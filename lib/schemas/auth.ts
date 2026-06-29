import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().optional(),
  email: z.email("A valid email is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Change-password requires both the current and new passwords, and the new
 * password must differ from the old one. We express the "differ" rule as a
 * schema-level `.refine` so it's reported under the right field for the UI.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must differ from the current password",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
