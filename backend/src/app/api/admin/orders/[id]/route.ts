import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可访问" }, { status: 403 });

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ message: "缺少订单ID" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      worker: {
        include: {
          user: true,
        },
      },
      review: true,
      afterSale: true,
      appeals: true,
      conversation: {
        include: { messages: { orderBy: { createdAt: "desc" }, take: 10 } },
      },
    },
  });

  if (!order) return NextResponse.json({ message: "订单不存在" }, { status: 404 });

  const plain = {
    id: order.id,
    type: order.type,
    title: order.title,
    description: order.description,
    status: order.status,
    amount: order.amount.toString(),
    address: order.address,
    expectedTime: order.expectedTime,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    images: (order.images as string[]) || [],
    deliveryNote: order.deliveryNote,
    deliveryImages: (order.deliveryImages as string[]) || [],
    deliveredAt: order.deliveredAt?.toISOString() || null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    user: order.user
      ? {
          id: order.user.id,
          nickname: order.user.nickname,
          openid: order.user.openid,
          phone: order.user.phone,
        }
      : null,
    worker: order.worker
      ? {
          id: order.worker.id,
          userId: order.worker.userId,
          nickname: order.worker.user?.nickname,
          phone: order.worker.user?.phone,
        }
      : null,
    review: order.review
      ? {
          rating: order.review.rating,
          content: order.review.content,
        }
      : null,
    afterSale: order.afterSale
      ? {
          status: order.afterSale.status,
          reason: order.afterSale.reason,
          result: order.afterSale.result,
        }
      : null,
    appeals: order.appeals?.map((a) => ({
      id: a.id,
      status: a.status,
      reason: a.reason,
      result: a.result,
    })),
    conversation: order.conversation
      ? {
          id: order.conversation.id,
          messages: order.conversation.messages.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            receiverId: m.receiverId,
            content: m.content,
            messageType: m.messageType,
            actionType: m.actionType,
            createdAt: m.createdAt.toISOString(),
          })),
        }
      : null,
  };

  return NextResponse.json(plain);
}
