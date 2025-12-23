import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;

  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { skills, alipayAccount, isAccepting, statusReason, id: bodyId } = body as {
    skills?: string;
    alipayAccount?: string | null;
    isAccepting?: boolean;
    statusReason?: string | null;
    id?: string;
  };
  const targetId = paramId || bodyId;
  if (!targetId) return NextResponse.json({ message: "缺少兼职者ID" }, { status: 400 });

  try {
    const updated = await prisma.worker.update({
      where: { id: targetId },
      data: {
        ...(skills !== undefined ? { skills } : {}),
        ...(alipayAccount !== undefined ? { alipayAccount } : {}),
        ...(typeof isAccepting === "boolean" ? { isAccepting } : {}),
        ...(statusReason !== undefined ? { statusReason } : {}),
      },
    });

    await prisma.adminAudit.create({
      data: {
        type: "worker",
        targetId,
        action: "comment",
        reason: "admin update",
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "更新失败" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });

  try {
    await prisma.worker.delete({ where: { id } });
    await prisma.adminAudit.create({
      data: {
        type: "worker",
        targetId: id,
        action: "disable",
        reason: "admin delete",
      },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { message: "删除失败，可能存在关联数据，请先清理关联或使用审核/禁用" },
      { status: 400 }
    );
  }
}
