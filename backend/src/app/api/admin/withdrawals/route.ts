import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可访问" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");

  const list = await prisma.withdrawal.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
    include: { worker: { include: { user: true } } },
  });

  return NextResponse.json(list);
}
