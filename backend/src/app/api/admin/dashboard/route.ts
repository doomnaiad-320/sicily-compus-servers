import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可访问" }, { status: 403 });

  const [userCount, orderCount, workerCount, completedOrders, totalIncome] =
    await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.worker.count(),
      prisma.order.count({ where: { status: "completed" } }),
      prisma.order.aggregate({ _sum: { amount: true }, where: { status: "completed" } }),
    ]);

  return NextResponse.json({
    userCount,
    orderCount,
    workerCount,
    completedOrders,
    totalIncome: totalIncome._sum.amount || 0,
  });
}
