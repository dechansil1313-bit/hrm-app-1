import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// POST: Create an Employee
export async function POST(request: NextRequest) {
  try {
    // Use the correct generated Prisma type (singular model name) and client property
    const body: Prisma.EmployeeCreateInput = await request.json();
    
    // Automatically generate an employeeId if the tester didn't provide one
    if (!body.employeeId) {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(1000 + Math.random() * 9000); // e.g., 4829
      body.employeeId = `HRM-${year}-${randomNum}`;
    }
    
    const newEmployee = await prisma.employee.create({
      data: body,
    });
    return NextResponse.json(newEmployee, { status: 201 });
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