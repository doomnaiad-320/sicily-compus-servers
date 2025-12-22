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

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.workerId !== worker.id) {
    return NextResponse.json({ message: "订单不存在或无权限" }, { status: 404 });
  }

  if (order.status !== "in_progress") {
    return NextResponse.json({ message: "当前状态不可标记完成" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      status: "waiting_confirm",
      serviceCompletedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
