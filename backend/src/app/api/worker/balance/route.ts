import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (!worker) {
    return NextResponse.json({ message: "兼职者信息不存在" }, { status: 404 });
  }

  return NextResponse.json({
    balance: worker.balance,
    alipayAccount: worker.alipayAccount,
  });
}
