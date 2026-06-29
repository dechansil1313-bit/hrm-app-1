import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST: Change the authenticated user's own password.
// Requires the current password to make accidental changes harder.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
      { status: 400 },
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters" },
      { status: 400 },
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must differ from the current password" },
      { status: 400 },
    );
  }

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
