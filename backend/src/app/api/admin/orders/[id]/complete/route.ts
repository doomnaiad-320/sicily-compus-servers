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
  });

  if (!order) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "waiting_confirm") {
    return NextResponse.json({ message: "仅待确认状态可标记完成" }, { status: 400 });
  }

  const now = new Date();
  const workMinutes =
    order.takenAt && order.serviceCompletedAt
      ? Math.max(
          0,
          Math.round(
            (order.serviceCompletedAt.getTime() - order.takenAt.getTime()) / 60000
          )
        )
      : 0;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        status: "completed",
        confirmedAt: now,
        ...(order.serviceCompletedAt ? {} : { serviceCompletedAt: now }),
      },
    });

    if (order.workerId) {
      await tx.worker.update({
        where: { id: order.workerId },
        data: {
          balance: { increment: order.amount },
        },
      });

      await tx.workerStats.upsert({
        where: { workerId: order.workerId },
        update: {
          completedCount: { increment: 1 },
          totalIncome: { increment: order.amount },
          totalWorkMinutes: { increment: workMinutes },
        },
        create: {
          workerId: order.workerId,
          acceptedCount: 0,
          completedCount: 1,
          positiveCount: 0,
          negativeCount: 0,
          totalIncome: order.amount,
          totalWorkMinutes: workMinutes,
        },
      });
    }

    return updatedOrder;
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    confirmedAt: updated.confirmedAt?.toISOString() || null,
    updatedAt: updated.updatedAt?.toISOString() || null,
    message: "已标记完成",
  });
}
