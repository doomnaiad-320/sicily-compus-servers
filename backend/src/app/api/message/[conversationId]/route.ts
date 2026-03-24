import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";
import { getConversationForUser } from "@/lib/conversation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  const { conversationId } = await params;

  const conv = await getConversationForUser(conversationId, auth.userId!);
  if (!conv) {
    return NextResponse.json({ message: "会话不存在或无权限" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
