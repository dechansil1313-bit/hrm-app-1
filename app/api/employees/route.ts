import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createEmployeeSchema } from "@/lib/schemas/employee";
import { parseJsonBody } from "@/lib/validation/parseJsonBody";

const DEFAULT_PASSWORD = "password123";

// POST: Create an Employee and (atomically) its login User.
export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, createEmployeeSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    // Server-side defaults for fields the Quick Add dialog leaves blank. We
    // mutate `body` (zod returns a fresh object, so this is safe) instead of
    // hand-building a separate object, so the spread below picks up the
    // auto-generated `employeeId` without reshaping.
    if (!body.employeeId) {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000); // e.g., 4829
      body.employeeId = `HRM-${year}-${randomNum}`;
    }

    // Both records are created atomically so we never end up with an
    // employee pointing at a non-existent user (or vice versa). If a user
    // already exists for this email, we link to them without touching their
    // password (a self-registered user keeps the password they chose).
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let user = await tx.user.findUnique({ where: { email: body.email } });
      let createdNewUser = false;

      if (!user) {
        const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12);
        user = await tx.user.create({
          data: {
            email: body.email,
            name: body.name,
            password: hashed,
            role: body.role ?? "USER",
          },
        });
        createdNewUser = true;
      }

      // After the server-side defaulting above, `employeeId` is guaranteed
      // to be a string at runtime. The type assertion tells TS to trust that
      // all required fields are present (Zod validated + runtime defaults).
      const employee = await tx.employee.create({
        data: {
          ...body,
          userId: user.id,
        } as Prisma.EmployeeUncheckedCreateInput,
      });

      return { employee, user, createdNewUser };
    });

    return NextResponse.json(
      {
        employee: result.employee,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        // Surfaced to the admin UI so they can communicate the temporary
        // credential. Only included when we minted a brand-new User this turn.
        defaultPassword: result.createdNewUser ? DEFAULT_PASSWORD : null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// GET: Fetch Employees (optionally filter by userId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const where = userId ? { userId } : {};
    const employees = await prisma.employee.findMany({ where });
    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
