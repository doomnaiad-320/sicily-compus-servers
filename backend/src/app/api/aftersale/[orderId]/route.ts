import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const afterSale = await prisma.afterSale.findUnique({
    where: { orderId: params.orderId },
    include: {
      order: true,
    },
  });

  if (!afterSale) {
    return NextResponse.json({ message: "售后不存在" }, { status: 404 });
  }

  if (
    afterSale.order.userId !== auth.userId &&
    afterSale.order.workerId &&
    afterSale.order.workerId !== (await getWorkerId(auth.userId))
  ) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  return NextResponse.json(afterSale);
}

async function getWorkerId(userId?: string | null) {
  if (!userId) return null;
  const worker = await prisma.worker.findUnique({
    where: { userId },
    select: { id: true },
  });
  return worker?.id || null;
}
