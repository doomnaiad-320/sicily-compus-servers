import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

type MessageType = "text" | "action";
type ActionType =
  | "request_ready"
  | "request_take"
  | "mark_service_done"
  | "request_confirm"
  | "request_aftersale"
  | "request_appeal";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { conversationId, orderId, content, messageType, actionType } = body as {
    conversationId?: string;
    orderId?: string;
    content?: string;
    messageType?: MessageType;
    actionType?: ActionType;
  };

  if (!content) {
    return NextResponse.json({ message: "内容不能为空" }, { status: 400 });
  }

  const type: MessageType = messageType || "text";
  if (type === "action" && !actionType) {
    return NextResponse.json({ message: "动作消息必须提供 actionType" }, { status: 400 });
  }

  // Resolve conversation and participants
  const conversation = conversationId
    ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { worker: { select: { userId: true } } },
      })
    : null;

  let conv = conversation;

  if (!conv) {
    if (!orderId) {
      return NextResponse.json({ message: "缺少 conversationId 或 orderId" }, { status: 400 });
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { worker: true },
    });
    if (!order || !order.workerId || (order.userId !== auth.userId && order.worker?.userId !== auth.userId)) {
      return NextResponse.json({ message: "订单不存在或无权限" }, { status: 404 });
    }

    const workerUserId = order.worker?.userId as string;
    conv = await prisma.conversation.upsert({
      where: { orderId },
      update: {},
      create: {
        orderId,
        userId: order.userId,
        workerId: order.workerId,
      },
      include: { worker: { select: { userId: true } } },
    });

    if (conv.userId !== auth.userId && workerUserId !== auth.userId) {
      return NextResponse.json({ message: "无权限" }, { status: 403 });
    }
  } else {
    const workerUserId = conv.worker?.userId;
    if (conv.userId !== auth.userId && workerUserId !== auth.userId) {
      return NextResponse.json({ message: "会话不存在或无权限" }, { status: 404 });
    }
  }

  const workerUserId = conv.worker?.userId as string;
  const receiverId = auth.userId === conv.userId ? workerUserId : conv.userId;

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: conv!.id,
        senderId: auth.userId!,
        receiverId,
        orderId: conv!.orderId || null,
        content,
        messageType: type,
        actionType: actionType || null,
      },
    });

    await tx.conversation.update({
      where: { id: conv!.id },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  return NextResponse.json(message, { status: 201 });
}
