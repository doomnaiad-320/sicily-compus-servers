import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
    select: { id: true },
  });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userId: auth.userId! },
        worker ? { workerId: worker.id } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      order: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      worker: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    conversations.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      lastMessage: c.messages[0] || null,
      updatedAt: c.updatedAt,
      userId: c.userId,
      workerId: c.workerId,
      workerUserId: c.worker?.userId,
      orderStatus: c.order?.status,
    }))
  );
}
