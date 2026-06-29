import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const DEFAULT_PASSWORD = "password123";

// POST: Create an Employee and (atomically) its login User.
export async function POST(request: NextRequest) {
  try {
    // Use the *Unchecked* input type because the Quick Add dialog sends flat
    // scalar fields, not nested relation objects. The unchecked form exposes
    // raw FK scalars like `userId`, which lets us spread `body` and then set
    // `userId: user.id` in one shot — Prisma's create() input is
    // `EmployeeCreateInput XOR EmployeeUncheckedCreateInput`, so you can't
    // mix the two.
    const body: Prisma.EmployeeUncheckedCreateInput = await request.json();

    // Minimal server-side validation. The schema enforces unique emails, but
    // reject obviously bad input early so we can return a friendly error and
    // skip the bcrypt round.
    if (typeof body.email !== "string" || !body.email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
    }

    // Automatically generate an employeeId if the tester didn't provide one
    if (!body.employeeId) {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000); // e.g., 4829
      body.employeeId = `HRM-${year}-${randomNum}`;
    }

    // Both records are created atomically so we never end up with an
    // employee pointing at a non-existent user (or vice versa). If a user
    // already exists for this email, we link to them without touching their
    // password (a self-registered user keeps the password they chose).
    const { employee, user, createdNewUser } = await prisma.$transaction(async (tx) => {
      const email = body.email as string;
      let user = await tx.user.findUnique({ where: { email } });
      let createdNewUser = false;

      if (!user) {
        const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12);
        user = await tx.user.create({
          data: {
            email,
            name: body.name as string,
            password: hashed,
            role: (typeof body.role === "string" ? body.role : "USER"),
          },
        });
        createdNewUser = true;
      }

      const employee = await tx.employee.create({
        data: { ...body, userId: user.id },
      });

      return { employee, user, createdNewUser };
    });

    return NextResponse.json(
      {
        employee,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        // Surfaced to the admin UI so they can communicate the temporary
        // credential. Only included when we minted a brand-new User this turn.
        defaultPassword: createdNewUser ? DEFAULT_PASSWORD : null,
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