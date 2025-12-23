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
  const { action, result } = body as { action?: "favor_user" | "favor_worker" | "refund"; result?: string };

  if (!action) {
    return NextResponse.json({ message: "请提供仲裁结果" }, { status: 400 });
  }

  const appeal = await prisma.appeal.findUnique({
    where: { id },
    include: { order: true },
  });

  if (!appeal) {
    return NextResponse.json({ message: "申诉记录不存在" }, { status: 404 });
  }

  if (appeal.status === "resolved") {
    return NextResponse.json({ message: "该申诉已处理" }, { status: 400 });
  }

  // 根据action决定订单状态
  let newOrderStatus: string;
  let resultText: string;

  switch (action) {
    case "favor_user":
      // 支持用户，取消订单退款
      newOrderStatus = "cancelled";
      resultText = result || "仲裁结果：支持用户，已退款";
      break;
    case "favor_worker":
      // 支持兼职者，订单完成
      newOrderStatus = "completed";
      resultText = result || "仲裁结果：支持兼职者，订单完成";
      break;
    case "refund":
      // 部分退款或全额退款
      newOrderStatus = "cancelled";
      resultText = result || "仲裁结果：已退款";
      break;
    default:
      return NextResponse.json({ message: "无效的仲裁结果" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.appeal.update({
      where: { id },
      data: {
        status: "resolved",
        result: resultText,
      },
    });

    const updateData: any = { status: newOrderStatus };

    if (action === "favor_user" || action === "refund") {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = "admin";
      updateData.cancelReason = resultText;
    } else if (action === "favor_worker") {
      updateData.confirmedAt = new Date();
    }

    await tx.order.update({
      where: { id: appeal.orderId },
      data: updateData,
    });
  });

  return NextResponse.json({
    id,
    status: "resolved",
    result: resultText,
    orderStatus: newOrderStatus,
    message: "申诉处理完成",
  });
}
