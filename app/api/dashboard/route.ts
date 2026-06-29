import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Parallel execute structural counters alongside the list retrieval limits
    const [totalEmployees, statusCounts, departmentGroupings, recentList] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { id: true },
      }),
      prisma.employee.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          employeeId: true,
          name: true,
          department: true,
          position: true,
          status: true,
          joinDate: true,
        },
      }),
    ]);

    type StatusGroup = (typeof statusCounts)[number];
    type DeptGroup = (typeof departmentGroupings)[number];

    const activeCount =
      statusCounts.find((s: StatusGroup) => s.status === "ACTIVE")?._count.id || 0;
    const inactiveCount =
      statusCounts.find((s: StatusGroup) => s.status === "INACTIVE")?._count.id || 0;

    const formattedDepartments = departmentGroupings.map((dept: DeptGroup) => ({
      name: dept.department,
      count: dept._count.id,
    }));

    const mockGrowth = [
      { month: "Jan", employees: Math.max(0, totalEmployees - 4) },
      { month: "Feb", employees: Math.max(0, totalEmployees - 2) },
      { month: "Mar", employees: totalEmployees },
    ];

    return NextResponse.json({
      stats: {
        totalHeadcount: totalEmployees,
        activeStaff: activeCount,
        exitedStaff: inactiveCount,
        departmentsCount: formattedDepartments.length,
      },
      departments: formattedDepartments,
      growth: mockGrowth,
      recentEmployees: recentList, // Inject database rows straight into the data block
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown metrics error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}