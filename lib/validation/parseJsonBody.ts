import { NextResponse } from "next/server";
import { z, type ZodTypeAny } from "zod";

/**
 * Parse + validate a `Request` JSON body against a Zod schema.
 *
 * Returns a tagged union so callers can branch on the result without leaking
 * Zod's internals into every handler:
 *
 * ```ts
 * const parsed = await parseJsonBody(request, createEmployeeSchema);
 * if (!parsed.ok) return parsed.response;
 * const body = parsed.data; // fully typed (z.infer<typeof schema>)
 * ```
 *
 * Error responses keep the existing `{ error: string }` shape stable for
 * front-end callers, while adding an optional `issues` map carrying
 * Zod's per-field error messages for dev/debug.
 */
export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const flat = result.error.flatten();
    // Walk every per-field issue and use the first one as the primary
    // top-level `error` so callers reading `data.error` get a specific reason
    // (e.g. "Photo data is required") instead of a generic fallback. The full
    // per-field map is still attached as `issues` for callers that want the
    // structured detail. Form-level errors (e.g. cross-field `.refine`s) are
    // appended so they aren't silently dropped.
    const messages = [
      ...Object.values(flat.fieldErrors).flat(),
      ...flat.formErrors,
    ];
    const error = messages[0] ?? "Invalid request body";
    return {
      ok: false,
      response: NextResponse.json(
        { error, issues: flat.fieldErrors },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: result.data };
}
