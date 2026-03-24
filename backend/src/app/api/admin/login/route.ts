import { NextRequest, NextResponse } from "next/server";
import { signUserToken } from "@/lib/auth";
import {
  buildMissingEnvMessage,
  getMissingEnv,
  logMissingEnv,
} from "@/lib/env";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  const missingAdminEnv = getMissingEnv([
    "ADMIN_USERNAME",
    "ADMIN_PASSWORD",
    "JWT_SECRET",
  ]);
  if (missingAdminEnv.length > 0) {
    logMissingEnv("/api/admin/login", missingAdminEnv);
    return NextResponse.json(
      {
        message:
          buildMissingEnvMessage(
            missingAdminEnv,
            "管理员登录配置缺失，请联系管理员"
          ) || "管理员登录配置缺失，请联系管理员",
      },
      { status: 500 }
    );
  }

  if (!username || !password) {
    return NextResponse.json({ message: "缺少用户名或密码" }, { status: 400 });
  }

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.json({ message: "账号或密码错误" }, { status: 401 });
  }

  const token = await signUserToken({ userId: "admin", role: "admin" }, "1d");

  return NextResponse.json({ token });
}
