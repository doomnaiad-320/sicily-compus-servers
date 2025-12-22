import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function PUT(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { alipayAccount } = body as { alipayAccount?: string };

  if (!alipayAccount) {
    return NextResponse.json({ message: "alipayAccount 不能为空" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (!worker) {
    return NextResponse.json({ message: "请先完成兼职者建档/认证" }, { status: 400 });
  }

  const updated = await prisma.worker.update({
    where: { userId: auth.userId! },
    data: { alipayAccount },
  });

  return NextResponse.json({
    alipayAccount: updated.alipayAccount,
  });
}
