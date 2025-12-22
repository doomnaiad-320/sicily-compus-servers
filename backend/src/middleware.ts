import { NextRequest, NextResponse } from "next/server";
import { verifyJwtFromRequest } from "@/lib/auth";

const PUBLIC_API_PATHS = ["/api/user/login", "/api/admin/login", "/api/upload"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const auth = await verifyJwtFromRequest(req);

  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: 401 });
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", auth.userId);
  if (auth.role) {
    requestHeaders.set("x-user-role", auth.role);
  }
  if (auth.openid) {
    requestHeaders.set("x-user-openid", auth.openid);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
