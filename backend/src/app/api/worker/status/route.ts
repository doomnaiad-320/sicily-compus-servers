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
    return NextResponse.json({ status: "none" });
  }

  return NextResponse.json({
    status: worker.status,
    reason: worker.statusReason,
    isAccepting: worker.isAccepting,
    phoneVerified: worker.phoneVerified,
    alipayAccount: worker.alipayAccount,
  });
}
