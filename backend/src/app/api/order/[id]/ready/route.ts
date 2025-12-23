import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "consulting") {
    return NextResponse.json({ message: "当前状态不可发布请接单" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "pending",
      readyAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
