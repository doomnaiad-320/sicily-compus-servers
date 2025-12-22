import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可访问" }, { status: 403 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      worker: true,
      review: true,
      afterSale: true,
      appeals: true,
      conversation: {
        include: { messages: { orderBy: { createdAt: "desc" }, take: 10 } },
      },
    },
  });

  if (!order) return NextResponse.json({ message: "订单不存在" }, { status: 404 });

  return NextResponse.json(order);
}
