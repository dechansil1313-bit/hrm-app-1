import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateUserRoleSchema } from "@/lib/schemas/user";
import { parseJsonBody } from "@/lib/validation/parseJsonBody";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;
  const parsed = await parseJsonBody(request, updateUserRoleSchema);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.data;

  // Prevent demoting yourself from admin
  if (id === session.user.id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "You cannot change your own role from admin" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
