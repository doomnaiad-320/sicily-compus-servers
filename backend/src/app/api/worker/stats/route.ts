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

  if (!worker || !worker.stats) {
    return NextResponse.json({ message: "兼职者信息不存在" }, { status: 404 });
  }

  const { acceptedCount, completedCount, positiveCount, negativeCount, totalIncome, totalWorkMinutes } =
    worker.stats;

  const totalReviews = positiveCount + negativeCount;
  const positiveRate =
    totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) / 100 : 1;

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
