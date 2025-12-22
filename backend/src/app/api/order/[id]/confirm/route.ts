import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "waiting_confirm") {
    return NextResponse.json({ message: "当前状态不可确认" }, { status: 400 });
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

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: params.id },
      data: {
        status: "completed",
        confirmedAt: now,
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

    return updated;
  });

  return NextResponse.json(result);
}
