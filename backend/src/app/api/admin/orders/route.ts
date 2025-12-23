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
      worker: {
        include: {
          user: true,
        },
      },
      review: true,
      afterSale: true,
      appeals: true,
    },
  });

  const plain = orders.map((o) => ({
    id: o.id,
    type: o.type,
    title: o.title,
    description: o.description,
    status: o.status,
    amount: o.amount.toString(),
    address: o.address,
    expectedTime: o.expectedTime,
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    images: (o.images as string[]) || [],
    deliveryNote: o.deliveryNote,
    deliveryImages: (o.deliveryImages as string[]) || [],
    deliveredAt: o.deliveredAt?.toISOString() || null,
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
          nickname: o.worker.user?.nickname,
          phone: o.worker.user?.phone,
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
