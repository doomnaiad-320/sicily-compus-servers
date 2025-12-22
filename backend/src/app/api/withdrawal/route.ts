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

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });
  if (!worker) {
    return NextResponse.json({ message: "兼职者信息不存在" }, { status: 404 });
  }

  const list = await prisma.withdrawal.findMany({
    where: { workerId: worker.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { amount, alipayAccount } = body as {
    amount?: number | string;
    alipayAccount?: string;
  };

  const decimalAmount = toDecimal(amount);
  if (!decimalAmount) {
    return NextResponse.json({ message: "金额无效" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (!worker) {
    return NextResponse.json({ message: "兼职者信息不存在" }, { status: 404 });
  }
  const targetAccount = alipayAccount || worker.alipayAccount;
  if (!targetAccount) {
    return NextResponse.json({ message: "请先设置支付宝账号" }, { status: 400 });
  }
  if (worker.balance < decimalAmount) {
    return NextResponse.json({ message: "余额不足" }, { status: 400 });
  }

  const withdrawal = await prisma.$transaction(async (tx) => {
    const created = await tx.withdrawal.create({
      data: {
        workerId: worker.id,
        amount: decimalAmount,
        status: "pending",
        alipayAccount: targetAccount,
      },
    });

    await tx.worker.update({
      where: { id: worker.id },
      data: {
        balance: { decrement: decimalAmount },
      },
    });

    return created;
  });

  return NextResponse.json(withdrawal, { status: 201 });
}
