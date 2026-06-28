import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;
  const { role } = await request.json();

  if (!role || (role !== "USER" && role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Role must be 'USER' or 'admin'" },
      { status: 400 },
    );
  }

  // Prevent demoting yourself from admin
  if (id === session.user.id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "You cannot change your own role from admin" },
      { status: 400 },
    );
  }

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
}
