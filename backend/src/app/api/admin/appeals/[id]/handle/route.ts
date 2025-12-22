import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { result } = body as { result?: string };

  if (!result) {
    return NextResponse.json({ message: "result 不能为空" }, { status: 400 });
  }

  const appeal = await prisma.appeal.findUnique({ where: { id: params.id } });
  if (!appeal) {
    return NextResponse.json({ message: "申诉不存在" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedAppeal = await tx.appeal.update({
      where: { id: params.id },
      data: {
        status: "resolved",
        result,
      },
    });

    await tx.order.update({
      where: { id: appeal.orderId },
      data: {
        status: "waiting_confirm",
      },
    });

    await tx.adminAudit.create({
      data: {
        type: "appeal",
        targetId: params.id,
        action: "comment",
        reason: result,
      },
    });

    return updatedAppeal;
  });

  return NextResponse.json(updated);
}
