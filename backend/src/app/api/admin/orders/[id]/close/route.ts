import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status === "completed") {
    return NextResponse.json({ message: "已完成订单不可关闭" }, { status: 400 });
  }
  if (order.status === "cancelled") {
    return NextResponse.json({ message: "订单已取消" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: "管理员关闭订单",
      cancelledBy: "admin",
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    cancelledAt: updated.cancelledAt?.toISOString() || null,
    message: "订单已关闭",
  });
}
