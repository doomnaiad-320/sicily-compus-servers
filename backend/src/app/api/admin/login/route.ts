import { NextRequest, NextResponse } from "next/server";
import { signUserToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

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
