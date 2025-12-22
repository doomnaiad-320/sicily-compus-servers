import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  if (!reason) {
    return NextResponse.json({ message: "原因不能为空" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
  });

  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在或无权限" }, { status: 404 });
  }

  if (order.status !== "waiting_confirm") {
    return NextResponse.json({ message: "当前状态不可申请售后" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const afterSale = await tx.afterSale.upsert({
      where: { orderId: params.id },
      update: { reason, status: "pending", result: null },
      create: { orderId: params.id, reason, status: "pending" },
    });

    const orderUpdated = await tx.order.update({
      where: { id: params.id },
      data: {
        status: "aftersale",
      },
    });

    return { afterSale, order: orderUpdated };
  });

  return NextResponse.json(updated.order);
}
