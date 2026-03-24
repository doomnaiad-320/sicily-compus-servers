import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可操作" }, { status: 403 });
  const { id } = await params;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ message: "评价不存在" }, { status: 404 });

  await prisma.review.delete({ where: { id } });
  await prisma.adminAudit.create({
    data: {
      type: "review",
      targetId: id,
      action: "comment",
      reason: "删除评价",
    },
  });

  return NextResponse.json({ success: true });
}
