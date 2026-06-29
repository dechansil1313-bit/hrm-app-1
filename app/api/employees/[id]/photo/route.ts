import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { photoUploadSchema } from "@/lib/schemas/photo";
import { parseJsonBody } from "@/lib/validation/parseJsonBody";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST: Upload employee photo
export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Verify the employee exists and user has permission
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Only admins or the employee themselves can update photo
  const isAdmin = session.user.role === "ADMIN";
  const isOwnProfile = employee.userId === session.user.id;
  if (!isAdmin && !isOwnProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseJsonBody(request, photoUploadSchema);
  if (!parsed.ok) return parsed.response;
  const { photo } = parsed.data;

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: { photo },
      select: {
        id: true,
        photo: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: Remove employee photo
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwnProfile = employee.userId === session.user.id;
    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.employee.update({
      where: { id },
      data: { photo: null },
    });

    return NextResponse.json({ message: "Photo removed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
