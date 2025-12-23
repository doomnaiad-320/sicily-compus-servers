import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signUserToken } from "@/lib/auth";

const WECHAT_APPID = process.env.WECHAT_APPID || "";
const WECHAT_SECRET = process.env.WECHAT_SECRET || "";

interface WxSession {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

async function code2Session(code: string): Promise<WxSession> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`;

  const response = await fetch(url);
  const data = await response.json();
  return data as WxSession;
}

// 生成短ID格式的用户ID (U001, U002, ...)
async function generateUserId(): Promise<string> {
  const lastUser = await prisma.user.findFirst({
    where: {
      id: { startsWith: "U" },
    },
    orderBy: { id: "desc" },
    select: { id: true },
  });

  let seq = 1;
  if (lastUser?.id) {
    const lastSeq = parseInt(lastUser.id.slice(1), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `U${seq.toString().padStart(3, "0")}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code, openid: directOpenid, nickname, avatar } = body as {
    code?: string;
    openid?: string;
    nickname?: string;
    avatar?: string;
  };

  let openid: string | undefined;

  // 优先使用code换取openid（生产环境）
  if (code) {
    if (!WECHAT_APPID || !WECHAT_SECRET) {
      return NextResponse.json(
        { message: "微信配置缺失，请联系管理员" },
        { status: 500 }
      );
    }

    const wxSession = await code2Session(code);

    if (wxSession.errcode) {
      console.error("微信登录失败:", wxSession);
      return NextResponse.json(
        { message: `微信登录失败: ${wxSession.errmsg || "未知错误"}` },
        { status: 400 }
      );
    }

    openid = wxSession.openid;
  } else if (directOpenid) {
    // 兼容开发环境直接传openid
    openid = directOpenid;
  }

  if (!openid) {
    return NextResponse.json({ message: "缺少登录凭证" }, { status: 400 });
  }

  // 先查找是否已存在用户
  let user = await prisma.user.findUnique({
    where: { openid },
    include: { worker: true },
  });

  if (user) {
    // 已存在用户，更新信息
    user = await prisma.user.update({
      where: { openid },
      data: {
        ...(nickname ? { nickname } : {}),
        ...(avatar ? { avatar } : {}),
      },
      include: { worker: true },
    });
  } else {
    // 新用户，生成短ID
    const userId = await generateUserId();
    user = await prisma.user.create({
      data: {
        id: userId,
        openid,
        nickname: nickname || "微信用户",
        avatar: avatar || null,
      },
      include: { worker: true },
    });
  }

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
      isWorker: !!user.worker,
      workerStatus: user.worker?.status || null,
    },
  });
}
