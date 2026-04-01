import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const worker = await prisma.worker.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!worker) {
    return NextResponse.json({ message: "兼职者不存在" }, { status: 404 });
  }

  if (!isAdmin(req) && worker.userId !== auth.userId) {
    return NextResponse.json({ message: "无权查看该评价列表" }, { status: 403 });
  }

  const reviews = await prisma.review.findMany({
    where: { order: { workerId: id } },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          nickname: true,
          avatar: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNo: true,
          title: true,
          type: true,
          amount: true,
          confirmedAt: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      isPositive: review.isPositive,
      replyContent: review.replyContent,
      workerRepliedAt: review.workerRepliedAt?.toISOString() || null,
      createdAt: review.createdAt.toISOString(),
      user: review.user,
      order: {
        id: review.order.id,
        orderNo: review.order.orderNo,
        title: review.order.title,
        type: review.order.type,
        amount: review.order.amount.toString(),
        confirmedAt: review.order.confirmedAt?.toISOString() || null,
        createdAt: review.order.createdAt.toISOString(),
      },
    }))
  );
}
