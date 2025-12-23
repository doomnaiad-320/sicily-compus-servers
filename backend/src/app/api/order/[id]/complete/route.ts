import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { note, images } = body as { note?: string; images?: string[] };
  const safeImages = Array.isArray(images)
    ? images.filter((u) => typeof u === "string" && u)
    : [];

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (!worker) {
    return NextResponse.json({ message: "请先完成兼职者认证" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.workerId !== worker.id) {
    return NextResponse.json({ message: "订单不存在或无权限" }, { status: 404 });
  }

  if (order.status !== "in_progress") {
    return NextResponse.json({ message: "当前状态不可标记完成" }, { status: 400 });
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "waiting_confirm",
        serviceCompletedAt: new Date(),
        deliveredAt: new Date(),
        ...(note !== undefined ? { deliveryNote: note } : {}),
        ...(safeImages.length ? { deliveryImages: safeImages } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Complete order failed", error);
    return NextResponse.json(
      { message: error?.message || "交付失败" },
      { status: 500 }
    );
  }
}
