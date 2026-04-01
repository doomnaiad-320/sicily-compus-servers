import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { orderId, rating, content } = body as {
    orderId?: string;
    rating?: number;
    content?: string;
  };
  const trimmedContent = content?.trim();

  if (!orderId || rating === undefined) {
    return NextResponse.json({ message: "缺少 orderId 或 rating" }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ message: "rating 必须 1-5" }, { status: 400 });
  }
  if (trimmedContent && trimmedContent.length > 200) {
    return NextResponse.json({ message: "评价内容最多 200 字" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { review: true },
  });

  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在或无权限" }, { status: 404 });
  }
  if (order.status !== "completed") {
    return NextResponse.json({ message: "仅已完成订单可评价" }, { status: 400 });
  }
  if (!order.workerId) {
    return NextResponse.json({ message: "订单暂无兼职者，无法评价" }, { status: 400 });
  }
  if (order.review) {
    return NextResponse.json({ message: "该订单已评价" }, { status: 400 });
  }
  const workerId = order.workerId;

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        orderId,
        userId: auth.userId!,
        rating,
        content: trimmedContent || null,
        isPositive: rating >= 4,
      },
    });

    await tx.workerStats.upsert({
      where: { workerId },
      update: {
        positiveCount: { increment: rating >= 4 ? 1 : 0 },
        negativeCount: { increment: rating <= 2 ? 1 : 0 },
      },
      create: {
        workerId,
        acceptedCount: 0,
        completedCount: 0,
        positiveCount: rating >= 4 ? 1 : 0,
        negativeCount: rating <= 2 ? 1 : 0,
        totalIncome: 0,
        totalWorkMinutes: 0,
      },
    });

    return created;
  });

  return NextResponse.json(review, { status: 201 });
}
