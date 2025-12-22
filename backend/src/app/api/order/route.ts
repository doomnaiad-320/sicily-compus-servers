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

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { type, description, amount, address } = body as {
    type?: string;
    description?: string;
    amount?: number | string;
    address?: string;
  };

  const decimalAmount = toDecimal(amount);
  if (!type || !description || !address || !decimalAmount) {
    return NextResponse.json({ message: "参数不完整或金额无效" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      userId: auth.userId!,
      type,
      description,
      amount: decimalAmount,
      status: "unpaid",
      address,
    },
  });

  return NextResponse.json(order, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const search = req.nextUrl.searchParams;
  const role = search.get("role") || auth.role;
  const view = search.get("view"); // worker: available | mine

  if (role === "worker") {
    const worker = await prisma.worker.findUnique({
      where: { userId: auth.userId! },
    });
    if (!worker) {
      return NextResponse.json({ message: "未找到兼职者信息" }, { status: 400 });
    }

    if (view === "available") {
      const orders = await prisma.order.findMany({
        where: {
          status: "pending",
          workerId: null,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(orders);
    }

    const orders = await prisma.order.findMany({
      where: { workerId: worker.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(orders);
  }

  // 默认用户视角
  const orders = await prisma.order.findMany({
    where: { userId: auth.userId! },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(orders);
}
