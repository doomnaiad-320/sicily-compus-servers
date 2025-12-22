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

  if (!decision || (decision === "reject" && !reason)) {
    return NextResponse.json({ message: "缺少决策或原因" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({ where: { id: params.id } });
  if (!worker) {
    return NextResponse.json({ message: "兼职者不存在" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const status = decision === "approve" ? "approved" : "rejected";
    const w = await tx.worker.update({
      where: { id: params.id },
      data: {
        status,
        statusReason: reason || null,
      },
    });

    await tx.adminAudit.create({
      data: {
        type: "worker",
        targetId: params.id,
        action: decision === "approve" ? "approve" : "reject",
        reason: reason || "",
      },
    });

    return w;
  });

  return NextResponse.json(updated);
}
