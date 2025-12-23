import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

const CANCELLABLE_STATUSES = ["unpaid", "pending"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, workerId: true },
  });

  if (!order) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.userId !== auth.userId) {
    return NextResponse.json({ message: "无权操作此订单" }, { status: 403 });
  }

  if (!CANCELLABLE_STATUSES.includes(order.status as any)) {
    return NextResponse.json(
      { message: `当前状态(${order.status})不可取消，请申请售后或申诉` },
      { status: 400 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: reason || "用户主动取消",
      cancelledBy: "user",
    },
  });

  return NextResponse.json({
    id: updated.id,
    orderNo: (updated as any).orderNo,
    status: updated.status,
    cancelledAt: updated.cancelledAt?.toISOString(),
    cancelReason: updated.cancelReason,
    message: "订单已取消",
  });
}
