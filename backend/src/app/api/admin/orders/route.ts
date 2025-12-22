import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "admin";
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;
  if (!isAdmin(req)) return NextResponse.json({ message: "仅管理员可访问" }, { status: 403 });

  const status = req.nextUrl.searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      worker: true,
      review: true,
      afterSale: true,
      appeals: true,
    },
  });

  const plain = orders.map((o) => ({
    id: o.id,
    type: o.type,
    description: o.description,
    status: o.status,
    amount: o.amount.toString(),
    address: o.address,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    user: o.user
      ? {
          id: o.user.id,
          nickname: o.user.nickname,
          openid: o.user.openid,
          phone: o.user.phone,
        }
      : null,
    worker: o.worker
      ? {
          id: o.worker.id,
          userId: o.worker.userId,
        }
      : null,
    review: o.review
      ? {
          rating: o.review.rating,
          content: o.review.content,
        }
      : null,
    afterSale: o.afterSale
      ? {
          status: o.afterSale.status,
          reason: o.afterSale.reason,
          result: o.afterSale.result,
        }
      : null,
    appeals: o.appeals?.map((a) => ({
      id: a.id,
      status: a.status,
      reason: a.reason,
      result: a.result,
    })),
  }));

  return NextResponse.json(plain);
}
