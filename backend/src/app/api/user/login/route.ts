import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signUserToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { openid, nickname, avatar } = body as {
    openid?: string;
    nickname?: string;
    avatar?: string;
  };

  if (!openid) {
    return NextResponse.json({ message: "缺少 openid" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { openid },
    update: {
      nickname: nickname || "用户",
      avatar: avatar || null,
    },
    create: {
      openid,
      nickname: nickname || "新用户",
      avatar: avatar || null,
    },
    include: {
      worker: true,
    },
  });

  const token = await signUserToken({
    userId: user.id,
    openid: user.openid,
    role: user.currentRole,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      currentRole: user.currentRole,
    },
  });
}
