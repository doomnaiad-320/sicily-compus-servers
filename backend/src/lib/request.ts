import { NextRequest, NextResponse } from "next/server";

export function getUserFromHeaders(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");
  const openid = req.headers.get("x-user-openid");
  return { userId, role, openid };
}

export function requireUser(req: NextRequest) {
  const { userId, role, openid } = getUserFromHeaders(req);
  if (!userId) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "未授权" }, { status: 401 }),
    };
  }
  return { ok: true as const, userId, role, openid };
}
