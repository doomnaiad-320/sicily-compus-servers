import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

// 订单状态中文映射
const STATUS_TEXT: Record<string, string> = {
  unpaid: "待支付",
  pending: "待接单",
  in_progress: "服务中",
  waiting_confirm: "待确认",
  completed: "已完成",
  cancelled: "已取消",
  aftersale: "售后中",
  appealing: "申诉中",
};

// 服务类型中文映射
const SERVICE_TYPE_TEXT: Record<string, string> = {
  delivery: "代取快递",
  shopping: "代购物品",
  printing: "打印服务",
  tutoring: "学业辅导",
  errand: "跑腿代办",
  cleaning: "清洁服务",
  other: "其他服务",
};

function toDecimal(amount: number | string | undefined) {
  if (amount === undefined || amount === null) return null;
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(num) || num <= 0) return null;
  return new Prisma.Decimal(num);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const search = req.nextUrl.searchParams;
  const isPublic = search.get("public") === "true";

  // 先尝试查找已支付待接单的公开订单（任何人都可以查看）
  const publicOrder = await prisma.order.findFirst({
    where: {
      id: params.id,
      status: "pending", // 只有已支付待接单的订单才公开可见
      workerId: null,
    },
  });

  // 如果是公开可见的订单，直接返回（隐藏敏感信息）
  if (publicOrder) {
    return NextResponse.json(serializePublicOrder(publicOrder));
  }

  // 如果不是公开订单，需要登录验证
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

  return NextResponse.json(serializeOrder(order));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { type, description, amount, address, title, expectedTime, contactName, contactPhone, images } = body as {
    type?: string;
    description?: string;
    amount?: number | string;
    address?: string;
    title?: string;
    expectedTime?: string;
    contactName?: string;
    contactPhone?: string;
    images?: string[];
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
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(address ? { address } : {}),
      ...(expectedTime ? { expectedTime } : {}),
      ...(contactName ? { contactName } : {}),
      ...(contactPhone ? { contactPhone } : {}),
      ...(images ? { images } : {}),
      ...(decimalAmount ? { amount: decimalAmount } : {}),
    },
  });

  return NextResponse.json(serializeOrder(updated));
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

// 公开展示用的序列化（隐藏敏感联系信息）
function serializePublicOrder(o: any) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    serviceType: o.serviceType,
    serviceTypeText: SERVICE_TYPE_TEXT[o.serviceType] || o.serviceType,
    type: o.type,
    title: o.title,
    description: o.description,
    amount: o.amount?.toString?.() ?? o.amount,
    status: o.status,
    statusText: STATUS_TEXT[o.status] || o.status,
    address: o.address,
    expectedTime: o.expectedTime,
    createdAt: o.createdAt ? o.createdAt.toISOString() : null,
  };
}

function serializeOrder(o: any) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    userId: o.userId,
    workerId: o.workerId,
    serviceType: o.serviceType,
    serviceTypeText: SERVICE_TYPE_TEXT[o.serviceType] || o.serviceType,
    type: o.type,
    title: o.title,
    description: o.description,
    amount: o.amount?.toString?.() ?? o.amount,
    status: o.status,
    statusText: STATUS_TEXT[o.status] || o.status,
    address: o.address,
    expectedTime: o.expectedTime,
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    images: o.images || [],
    review: o.review || null,
    afterSale: o.afterSale || null,
    appeals: o.appeals || [],
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    readyAt: o.readyAt ? o.readyAt.toISOString() : null,
    takenAt: o.takenAt ? o.takenAt.toISOString() : null,
    serviceCompletedAt: o.serviceCompletedAt ? o.serviceCompletedAt.toISOString() : null,
    confirmedAt: o.confirmedAt ? o.confirmedAt.toISOString() : null,
    createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    updatedAt: o.updatedAt ? o.updatedAt.toISOString() : null,
    worker: o.worker || null,
  };
}
