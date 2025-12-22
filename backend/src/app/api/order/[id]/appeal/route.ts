import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  if (!reason) {
    return NextResponse.json({ message: "申诉原因不能为空" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
  });

  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在或无权限" }, { status: 404 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const appeal = await tx.appeal.create({
      data: {
        orderId: params.id,
        userId: auth.userId!,
        reason,
        status: "pending",
      },
    });

    await tx.order.update({
      where: { id: params.id },
      data: { status: "appealing" },
    });

    return appeal;
  });

  return NextResponse.json(created, { status: 201 });
}
