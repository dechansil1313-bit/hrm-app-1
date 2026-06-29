import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateEmployeeSchema } from "@/lib/schemas/employee";
import { parseJsonBody } from "@/lib/validation/parseJsonBody";

// Explicitly type the Context parameter for Next.js App Router dynamic routes
type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Fetch a Single Employee by ID
export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT: Update an Employee
export async function PUT(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const parsed = await parseJsonBody(request, updateEmployeeSchema);
    if (!parsed.ok) return parsed.response;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updatedEmployee, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

// DELETE: Remove an Employee
export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Employee deleted" }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
