import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function PUT(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { isAccepting } = body as { isAccepting?: boolean };

  if (typeof isAccepting !== "boolean") {
    return NextResponse.json({ message: "isAccepting 必须是布尔值" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (!worker || worker.status !== "approved") {
    return NextResponse.json({ message: "仅已通过审核的兼职者可操作" }, { status: 400 });
  }

  const updated = await prisma.worker.update({
    where: { userId: auth.userId! },
    data: { isAccepting },
  });

  return NextResponse.json({
    isAccepting: updated.isAccepting,
  });
}
