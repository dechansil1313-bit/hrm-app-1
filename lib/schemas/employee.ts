import { z } from "zod";

/**
 * Optional scalar fields. Empty string sent from `<input>` is normalized to
 * `undefined` so the DB stores `NULL` instead of `""`.
 */
const optionalScalar = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/**
 * Validate POST /api/employees (Quick Add).
 *
 * The dialog sends flat scalar fields (the "unchecked" shape Prisma uses for
 * `EmployeeUncheckedCreateInput`), so `employeeId` / `role` / `phone` /
 * `status` are optional here — the route handler fills in defaults before
 * reaching Prisma. Both `employeeId` and `phone` accept an empty string from
 * `<input>` and normalize it to `undefined` so the server-side auto-generator
 * runs (matches the pre-Zod behavior, which treated empty string as "auto").
 */
export const createEmployeeSchema = z.object({
  employeeId: optionalScalar,
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("A valid email is required"),
  role: z.string().trim().min(1).optional(),
  department: z.string().trim().min(1, "Department is required"),
  position: z.string().trim().min(1, "Position is required"),
  phone: optionalScalar,
  status: z
    .enum(["ACTIVE", "INACTIVE", "TERMINATED", "ON_LEAVE"])
    .optional(),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

/** Partial update — every field is optional for PUT /api/employees/[id]. */
export const updateEmployeeSchema = createEmployeeSchema.partial();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
