import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = req.headers.get("x-user-role");
  if (role !== "admin") {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, result } = body as { action?: "approve" | "reject" | "continue"; result?: string };

  if (!action) {
    return NextResponse.json({ message: "请提供处理动作" }, { status: 400 });
  }

  const afterSale = await prisma.afterSale.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!afterSale) {
    return NextResponse.json({ message: "售后记录不存在" }, { status: 404 });
  }

  if (afterSale.status === "resolved") {
    return NextResponse.json({ message: "该售后已处理" }, { status: 400 });
  }

  // 根据action决定订单状态
  let newOrderStatus: string;
  let resultText: string;

  switch (action) {
    case "approve":
      // 同意退款，订单取消
      newOrderStatus = "cancelled";
      resultText = result || "售后通过，已退款";
      break;
    case "reject":
      // 驳回售后，订单回到待确认
      newOrderStatus = "waiting_confirm";
      resultText = result || "售后驳回";
      break;
    case "continue":
      // 继续服务
      newOrderStatus = "in_progress";
      resultText = result || "继续服务";
      break;
    default:
      return NextResponse.json({ message: "无效的处理动作" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.afterSale.update({
      where: { id },
      data: {
        status: "resolved",
        result: resultText,
      },
    }),
    prisma.order.update({
      where: { id: afterSale.orderId },
      data: {
        status: newOrderStatus as any,
        ...(action === "approve" ? { cancelledAt: new Date(), cancelledBy: "admin", cancelReason: "售后退款" } : {}),
      },
    }),
  ]);

  return NextResponse.json({
    id,
    status: "resolved",
    result: resultText,
    orderStatus: newOrderStatus,
    message: "售后处理完成",
  });
}
