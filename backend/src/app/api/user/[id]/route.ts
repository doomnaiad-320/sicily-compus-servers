import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 删除用户API（仅用于开发测试）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;

  if (!userId) {
    return NextResponse.json({ message: "缺少用户ID" }, { status: 400 });
  }

  try {
    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        worker: true,
        orders: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "用户不存在" }, { status: 404 });
    }

    // 删除用户相关数据（级联删除）
    // 1. 删除用户的地址
    await prisma.address.deleteMany({ where: { userId } });

    // 2. 删除用户的评价
    await prisma.review.deleteMany({ where: { userId } });

    // 3. 删除用户的申诉
    await prisma.appeal.deleteMany({ where: { userId } });

    // 4. 删除用户发送和接收的消息
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    });

    // 5. 删除用户的会话
    await prisma.conversation.deleteMany({ where: { userId } });

    // 6. 如果用户有worker身份，删除相关数据
    if (user.worker) {
      // 删除worker相关的会话
      await prisma.conversation.deleteMany({ where: { workerId: user.worker.id } });
      // 删除worker统计
      await prisma.workerStats.deleteMany({ where: { workerId: user.worker.id } });
      // 删除提现记录
      await prisma.withdrawal.deleteMany({ where: { workerId: user.worker.id } });
      // 删除worker
      await prisma.worker.delete({ where: { id: user.worker.id } });
    }

    // 7. 删除用户的订单（如果有）
    for (const order of user.orders) {
      // 删除订单相关的会话
      await prisma.conversation.deleteMany({ where: { orderId: order.id } });
      await prisma.message.deleteMany({ where: { orderId: order.id } });
      await prisma.review.deleteMany({ where: { orderId: order.id } });
      await prisma.afterSale.deleteMany({ where: { orderId: order.id } });
      await prisma.appeal.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
    }

    // 6. 最后删除用户
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({
      success: true,
      message: `用户 ${userId} 已删除`,
      deletedUser: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
      },
    });
  } catch (error: any) {
    console.error("删除用户失败:", error);
    return NextResponse.json(
      { message: `删除失败: ${error.message}` },
      { status: 500 }
    );
  }
}

// 获取所有用户列表（仅用于开发测试）
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 如果id是 "list"，返回所有用户
  if (id === "list") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        openid: true,
        nickname: true,
        currentRole: true,
        createdAt: true,
      },
    });
    return NextResponse.json(users);
  }

  // 否则返回单个用户信息
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      worker: true,
      addresses: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json(user);
}
