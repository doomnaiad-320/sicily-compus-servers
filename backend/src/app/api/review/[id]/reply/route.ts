import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const replyContent = typeof body.replyContent === "string" ? body.replyContent.trim() : "";

  if (!replyContent) {
    return NextResponse.json({ message: "回复内容不能为空" }, { status: 400 });
  }
  if (replyContent.length > 200) {
    return NextResponse.json({ message: "回复内容最多 200 字" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
    select: { id: true },
  });

  if (!worker) {
    return NextResponse.json({ message: "兼职者信息不存在" }, { status: 404 });
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          workerId: true,
        },
      },
    },
  });

  if (!review || review.order.workerId !== worker.id) {
    return NextResponse.json({ message: "评价不存在或无权限回复" }, { status: 404 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      replyContent,
      workerRepliedAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}
