import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const conv = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    include: {
      worker: { select: { userId: true } },
    },
  });

  if (
    !conv ||
    (conv.userId !== auth.userId &&
      conv.worker?.userId !== auth.userId)
  ) {
    return NextResponse.json({ message: "会话不存在或无权限" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: params.conversationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
