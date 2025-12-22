import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (!worker) {
    return NextResponse.json({ message: "请先完成兼职者认证" }, { status: 400 });
  }

  if (worker.status !== "approved") {
    return NextResponse.json({ message: "兼职者未通过审核" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "pending") {
    return NextResponse.json({ message: "当前状态不可接单" }, { status: 400 });
  }

  if (order.workerId) {
    return NextResponse.json({ message: "订单已被接单" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const orderUpdated = await tx.order.update({
      where: { id: params.id },
      data: {
        workerId: worker.id,
        status: "in_progress",
        takenAt: new Date(),
      },
    });

    await tx.workerStats.upsert({
      where: { workerId: worker.id },
      update: {
        acceptedCount: { increment: 1 },
      },
      create: {
        workerId: worker.id,
        acceptedCount: 1,
        completedCount: 0,
        positiveCount: 0,
        negativeCount: 0,
        totalIncome: 0,
        totalWorkMinutes: 0,
      },
    });

    return orderUpdated;
  });

  return NextResponse.json(updated);
}
