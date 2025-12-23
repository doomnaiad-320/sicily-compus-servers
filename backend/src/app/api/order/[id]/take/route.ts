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

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (!worker) {
    return NextResponse.json({ message: "请先完成兼职者认证" }, { status: 400 });
  }

  if (worker.status !== "approved") {
    return NextResponse.json({ message: "兼职者未通过审核" }, { status: 400 });
  }

  if (!worker.isAccepting) {
    // 自动开启接单状态，避免因未切换开关导致无法接单
    await prisma.worker.update({
      where: { id: worker.id },
      data: { isAccepting: true },
    });
  }

  // 检查是否有进行中的订单
  const ongoingOrder = await prisma.order.findFirst({
    where: {
      workerId: worker.id,
      status: "in_progress",
    },
  });

  if (ongoingOrder) {
    return NextResponse.json(
      { message: "您有正在进行的订单，请先完成后再接新单" },
      { status: 400 }
    );
  }

  // 使用事务+乐观锁防止并发接单
  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 在事务中再次检查订单状态，确保未被其他人接走
      const order = await tx.order.findFirst({
        where: {
          id,
          status: "pending",
          workerId: null,
        },
      });

      if (!order) {
        throw new Error("ALREADY_TAKEN");
      }

      const orderUpdated = await tx.order.update({
        where: { id },
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

    return NextResponse.json({
      id: updated.id,
      orderNo: (updated as any).orderNo,
      status: updated.status,
      takenAt: updated.takenAt?.toISOString(),
      message: "接单成功",
    });
  } catch (error: any) {
    if (error.message === "ALREADY_TAKEN") {
      return NextResponse.json({ message: "订单已被其他人接走" }, { status: 400 });
    }
    throw error;
  }
}
