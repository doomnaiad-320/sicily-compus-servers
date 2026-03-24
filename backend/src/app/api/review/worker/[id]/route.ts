import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reviews = await prisma.review.findMany({
    where: { order: { workerId: id } },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { userId: true } } },
  });

  return NextResponse.json(reviews);
}
