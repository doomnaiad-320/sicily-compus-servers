import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { worker: true },
  });

  if (!user) {
    return NextResponse.json({ message: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    openid: user.openid,
    nickname: user.nickname,
    avatar: user.avatar,
    phone: user.phone,
    currentRole: user.currentRole,
    worker: user.worker,
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { nickname, avatar, phone } = body as {
    nickname?: string;
    avatar?: string | null;
    phone?: string | null;
  };

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data: {
      ...(nickname ? { nickname } : {}),
      ...(avatar !== undefined ? { avatar } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    nickname: updated.nickname,
    avatar: updated.avatar,
    phone: updated.phone,
    currentRole: updated.currentRole,
  });
}
