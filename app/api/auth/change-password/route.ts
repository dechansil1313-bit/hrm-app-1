import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/schemas/auth";
import { parseJsonBody } from "@/lib/validation/parseJsonBody";

// POST: Change the authenticated user's own password.
// Requires the current password to make accidental changes harder.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, changePasswordSchema);
  if (!parsed.ok) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });

  // Self-registered users always have a password. We mint a password only
  // for users created via the employee Quick Add flow, so this should always
  // be present in practice — guard it anyway to avoid a confusing 500.
  if (!user?.password) {
    return NextResponse.json(
      { error: "This account has no password to update" },
      { status: 400 },
    );
  }

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    // Use a generic message so we don't leak which half (email vs. password)
    // is invalid.
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 400 },
    );
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  // The JWT strategy is in use (see auth.ts), and the password is not part of
  // the token. The user's existing session stays valid — they only need to
  // re-authenticate if/when the JWT expires.
  return NextResponse.json({ ok: true });
}
