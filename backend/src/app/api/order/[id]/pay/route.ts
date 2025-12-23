import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "unpaid") {
    return NextResponse.json({ message: "当前状态不可支付" }, { status: 400 });
  }

  // 简化流程：支付后直接进入待接单状态
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "pending",
      paidAt: new Date(),
      readyAt: new Date(),
    },
  });

  return NextResponse.json({
    id: updated.id,
    orderNo: (updated as any).orderNo,
    status: updated.status,
    paidAt: updated.paidAt?.toISOString(),
    message: "支付成功，订单已发布",
  });
}
