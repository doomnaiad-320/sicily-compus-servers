import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) {
    return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { result } = body as { result?: string };
  if (!result) {
    return NextResponse.json({ message: "result 不能为空" }, { status: 400 });
  }

  const afterSale = await prisma.afterSale.findUnique({
    where: { orderId: params.orderId },
  });
  if (!afterSale) {
    return NextResponse.json({ message: "售后不存在" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const afterSaleUpdated = await tx.afterSale.update({
      where: { orderId: params.orderId },
      data: {
        status: "resolved",
        result,
      },
    });

    await tx.order.update({
      where: { id: params.orderId },
      data: { status: "waiting_confirm" },
    });

    await tx.adminAudit.create({
      data: {
        type: "order",
        targetId: params.orderId,
        action: "comment",
        reason: result,
      },
    });

    return afterSaleUpdated;
  });

  return NextResponse.json(updated);
}
