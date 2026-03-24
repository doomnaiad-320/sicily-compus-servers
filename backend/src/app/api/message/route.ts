import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";
import {
  getConversationForUser,
  resolveOrderConversationForUser,
} from "@/lib/conversation";

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

  let conv = conversationId
    ? await getConversationForUser(conversationId, auth.userId!)
    : null;

  if (!conv) {
    if (!orderId) {
      return NextResponse.json({ message: "缺少 conversationId 或 orderId" }, { status: 400 });
    }
    const resolved = await resolveOrderConversationForUser(orderId, auth.userId!);
    if (!resolved.ok) {
      return NextResponse.json(
        { message: resolved.message },
        { status: resolved.status }
      );
    }
    conv = resolved.conversation;
  }

  const workerUserId = conv.worker.userId;
  const receiverId = auth.userId === conv.userId ? workerUserId : conv.userId;

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId: conv.id,
        senderId: auth.userId!,
        receiverId,
        orderId: conv.orderId || null,
        content,
        messageType: type,
        actionType: actionType || null,
      },
    });

    await tx.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return created;
  });

  return NextResponse.json(message, { status: 201 });
}
