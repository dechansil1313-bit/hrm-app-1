import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: Fetch employees without a linked user (for linking dropdown)
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const unlinkedEmployees = await prisma.employee.findMany({
      where: { userId: null },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        department: true,
        position: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(unlinkedEmployees);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
