import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH: Link a user to an employee record
export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await context.params;
  const { userId } = await request.json();

  try {
    // Verify the employee exists
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // If userId is provided, link the user; otherwise, unlink
    if (userId) {
      // Verify the user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if this user is already linked to another employee
      const existingLink = await prisma.employee.findFirst({
        where: { userId, id: { not: id } },
      });
      if (existingLink) {
        return NextResponse.json(
          { error: "This user is already linked to another employee record" },
          { status: 400 }
        );
      }

      // Link the user to the employee
      const updated = await prisma.employee.update({
        where: { id },
        data: { userId },
        select: {
          id: true,
          employeeId: true,
          name: true,
          userId: true,
        },
      });

      return NextResponse.json(updated);
    } else {
      // Unlink the user from the employee
      const updated = await prisma.employee.update({
        where: { id },
        data: { userId: null },
        select: {
          id: true,
          employeeId: true,
          name: true,
          userId: true,
        },
      });

      return NextResponse.json(updated);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
