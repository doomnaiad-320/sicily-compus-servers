import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

const SERVICE_TYPES = ["delivery", "shopping", "printing", "tutoring", "errand", "cleaning", "other"] as const;
type ServiceTypeValue = typeof SERVICE_TYPES[number];

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

async function generateOrderNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `CS${dateStr}`;

  const lastOrder = await prisma.order.findFirst({
    where: { orderNo: { startsWith: prefix } },
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });

  let seq = 1;
  if (lastOrder?.orderNo) {
    const lastSeq = parseInt(lastOrder.orderNo.slice(-4), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${seq.toString().padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { type, serviceType, description, amount, address, title, expectedTime, contactName, contactPhone, images } = body as {
    type?: string;
    serviceType?: ServiceTypeValue;
    description?: string;
    amount?: number | string;
    address?: string;
    title?: string;
    expectedTime?: string;
    contactName?: string;
    contactPhone?: string;
    images?: string[];
  };

  const decimalAmount = toDecimal(amount);
  if (!type || !description || !address || !decimalAmount) {
    return NextResponse.json({ message: "参数不完整或金额无效" }, { status: 400 });
  }

  const validServiceType: ServiceTypeValue = serviceType && SERVICE_TYPES.includes(serviceType) ? serviceType : "other";
  const orderNo = await generateOrderNo();

  const order = await prisma.order.create({
    data: {
      orderNo,
      userId: auth.userId!,
      serviceType: validServiceType,
      type,
      description,
      amount: decimalAmount,
      status: "unpaid",
      address,
      ...(title ? { title } : {}),
      ...(expectedTime ? { expectedTime } : {}),
      ...(contactName ? { contactName } : {}),
      ...(contactPhone ? { contactPhone } : {}),
      ...(images ? { images } : {}),
    },
  });

  return NextResponse.json(serializeOrder(order), { status: 201 });
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const isPublic = search.get("public") === "true";

  // 公开接口：获取已支付且待接单的订单（首页展示用）
  if (isPublic) {
    // 尝试获取当前用户ID（如果已登录），用于过滤自己发布的订单
    const auth = requireUser(req);
    const currentUserId = auth.ok ? auth.userId : null;

    const orders = await prisma.order.findMany({
      where: {
        status: "pending", // 只展示已支付待接单的订单
        workerId: null,
        ...(currentUserId ? { userId: { not: currentUserId } } : {}), // 已登录时排除自己发布的订单
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // 公开展示时隐藏敏感信息
    return NextResponse.json(orders.map(serializePublicOrder));
  }

  // 其他接口需要登录
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

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
      // 可接单列表：待接单且不是自己发布的订单
      const orders = await prisma.order.findMany({
        where: {
          status: "pending",
          workerId: null,
          userId: { not: auth.userId! }, // 不显示自己发布的订单
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(orders.map(serializeOrder));
    }

    // 我的订单：只显示自己接的订单（兼职者视角）
    const orders = await prisma.order.findMany({
      where: { workerId: worker.id },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(orders.map(serializeOrder));
  }

  // 默认用户视角
  const orders = await prisma.order.findMany({
    where: { userId: auth.userId! },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(orders.map(serializeOrder));
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
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    readyAt: o.readyAt ? o.readyAt.toISOString() : null,
    takenAt: o.takenAt ? o.takenAt.toISOString() : null,
    serviceCompletedAt: o.serviceCompletedAt ? o.serviceCompletedAt.toISOString() : null,
    confirmedAt: o.confirmedAt ? o.confirmedAt.toISOString() : null,
    cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    cancelReason: o.cancelReason,
    cancelledBy: o.cancelledBy,
    createdAt: o.createdAt ? o.createdAt.toISOString() : null,
    updatedAt: o.updatedAt ? o.updatedAt.toISOString() : null,
  };
}
