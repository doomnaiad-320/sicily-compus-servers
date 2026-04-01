import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
    include: { stats: true },
  });

  if (!worker) {
    return NextResponse.json({ message: "兼职者信息不存在" }, { status: 404 });
  }

  const stats = worker.stats || {
    acceptedCount: 0,
    completedCount: 0,
    positiveCount: 0,
    negativeCount: 0,
    totalIncome: 0,
    totalWorkMinutes: 0,
  };

  const {
    acceptedCount,
    completedCount,
    positiveCount,
    negativeCount,
    totalIncome,
    totalWorkMinutes,
  } = stats;

  const totalReviews = positiveCount + negativeCount;
  const positiveRate =
    totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) / 100 : 0;

  return NextResponse.json({
    acceptedCount,
    completedCount,
    positiveCount,
    negativeCount,
    positiveRate,
    totalIncome,
    totalWorkMinutes,
  });
}
