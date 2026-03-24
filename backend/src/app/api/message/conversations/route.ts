import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";
import {
  conversationParticipantInclude,
  resolveOrderConversationForUser,
  serializeConversationForUser,
} from "@/lib/conversation";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
    select: { id: true },
  });

  const conversationFilters: Prisma.ConversationWhereInput[] = [
    { userId: auth.userId! },
  ];
  if (worker) {
    conversationFilters.push({ workerId: worker.id });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: conversationFilters,
    },
    include: {
      ...conversationParticipantInclude,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    conversations.map((c) => ({
      ...serializeConversationForUser(c, auth.userId!),
      lastMessage: c.messages[0] || null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { orderId } = body as { orderId?: string };

  if (!orderId) {
    return NextResponse.json({ message: "缺少 orderId" }, { status: 400 });
  }

  const resolved = await resolveOrderConversationForUser(orderId, auth.userId!);
  if (!resolved.ok) {
    return NextResponse.json(
      { message: resolved.message },
      { status: resolved.status }
    );
  }

  return NextResponse.json(
    serializeConversationForUser(resolved.conversation, auth.userId!)
  );
}
