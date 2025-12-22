import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function toDecimal(amount: number | string | undefined) {
  if (amount === undefined || amount === null) return null;
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(num) || num <= 0) return null;
  return new Prisma.Decimal(num);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const order = await prisma.order.findFirst({
    where: {
      id: params.id,
      OR: [
        { userId: auth.userId! },
        { worker: { userId: auth.userId! } },
      ],
    },
    include: {
      worker: true,
      review: true,
      afterSale: true,
      appeals: true,
    },
  });

  if (!order) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { type, description, amount, address } = body as {
    type?: string;
    description?: string;
    amount?: number | string;
    address?: string;
  };

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "unpaid") {
    return NextResponse.json({ message: "仅待支付订单可编辑" }, { status: 400 });
  }

  const decimalAmount = amount !== undefined ? toDecimal(amount) : undefined;
  if (amount !== undefined && !decimalAmount) {
    return NextResponse.json({ message: "金额无效" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      ...(type ? { type } : {}),
      ...(description ? { description } : {}),
      ...(address ? { address } : {}),
      ...(decimalAmount ? { amount: decimalAmount } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order || order.userId !== auth.userId) {
    return NextResponse.json({ message: "订单不存在" }, { status: 404 });
  }

  if (order.status !== "unpaid") {
    return NextResponse.json({ message: "仅待支付订单可删除" }, { status: 400 });
  }

  await prisma.order.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
