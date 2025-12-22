import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const reviews = await prisma.review.findMany({
    where: { order: { workerId: params.id } },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { userId: true } } },
  });

  return NextResponse.json(reviews);
}
