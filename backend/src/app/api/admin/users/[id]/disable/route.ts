import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });

  await prisma.adminAudit.create({
    data: {
      type: "user",
      targetId: params.id,
      action: "disable",
      reason: "手动禁用",
    },
  });

  // 软禁用：记录 audit，不删除。可扩展为状态字段，当前仅记录。
  return NextResponse.json({ success: true });
}
