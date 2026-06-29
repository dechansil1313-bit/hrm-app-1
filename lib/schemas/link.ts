import { z } from "zod";

/**
 * PATCH /api/employees/[id]/link — link a user to an employee record.
 *
 * - `{ userId: "<non-empty>" }` → link
 * - `{ userId: null }` or omitting the field → unlink
 * - `{ userId: "" }` → rejected (clients should send `null` for unlink)
 */
export const linkEmployeeSchema = z.object({
  userId: z.union([z.string().trim().min(1), z.null()]).optional(),
});
export type LinkEmployeeInput = z.infer<typeof linkEmployeeSchema>;
