import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "更新失败";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { nickname, phone, currentRole, id: bodyId } = body as {
    nickname?: string;
    phone?: string | null;
    currentRole?: "user" | "worker";
    id?: string;
  };
  const targetId = id || bodyId;
  if (!targetId) return NextResponse.json({ message: "缺少用户ID" }, { status: 400 });

  try {
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(nickname !== undefined ? { nickname } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(currentRole ? { currentRole } : {}),
      },
    });

    await prisma.adminAudit.create({
      data: {
        type: "user",
        targetId,
        action: "comment",
        reason: "admin update",
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });
  const { id } = await params;

  try {
    await prisma.user.delete({ where: { id } });
    await prisma.adminAudit.create({
      data: {
        type: "user",
        targetId: id,
        action: "disable",
        reason: "admin delete",
      },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "删除失败，可能存在关联数据，请先清理关联或使用禁用操作" },
      { status: 400 }
    );
  }
}
