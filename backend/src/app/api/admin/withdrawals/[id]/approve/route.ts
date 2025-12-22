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
  const { decision, reason } = body as { decision?: "approve" | "reject"; reason?: string };

  if (!decision) {
    return NextResponse.json({ message: "缺少 decision" }, { status: 400 });
  }

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: params.id },
  });

  if (!withdrawal) {
    return NextResponse.json({ message: "提现不存在" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    let status: "approved" | "rejected" | "paid" = "approved";
    if (decision === "reject") {
      status = "rejected";
      // 退回余额
      await tx.worker.update({
        where: { id: withdrawal.workerId },
        data: { balance: { increment: withdrawal.amount } },
      });
    } else {
      status = "paid";
    }

    const w = await tx.withdrawal.update({
      where: { id: params.id },
      data: {
        status,
        processedAt: new Date(),
      },
    });

    await tx.adminAudit.create({
      data: {
        type: "withdrawal",
        targetId: params.id,
        action: decision === "approve" ? "approve" : "reject",
        reason: reason || "",
      },
    });

    return w;
  });

  return NextResponse.json(updated);
}
