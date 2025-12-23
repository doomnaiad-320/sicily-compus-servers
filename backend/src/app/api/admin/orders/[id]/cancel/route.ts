import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status === "completed" || order.status === "cancelled") {
    return NextResponse.json(
      { message: `订单已${order.status === "completed" ? "完成" : "取消"}，无法再次取消` },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: reason || "管理员取消",
      cancelledBy: "admin",
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    cancelledAt: updated.cancelledAt?.toISOString(),
    cancelReason: updated.cancelReason,
    message: "订单已被管理员取消",
  });
}
