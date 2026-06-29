import { z } from "zod";

const TWO_MB = 2 * 1024 * 1024;
// base64 inflates payload by ~33%, and the prefix ("data:image/png;base64,",
// ~22 chars) is included in the string we receive. Reverse the bounds check
// the route used to do, with a small fudge factor for safety.
const MAX_BASE64_LEN = Math.ceil((TWO_MB * 4) / 3) + 64;

export const photoUploadSchema = z.object({
  photo: z
    .string()
    .min(1, "Photo data is required")
    .refine((p) => p.startsWith("data:image/"), {
      message: "Photo must be a data: URL",
    })
    .refine((p) => p.length <= MAX_BASE64_LEN, {
      message: "Photo must be less than 2MB",
    }),
});
export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;
