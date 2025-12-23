/* eslint-disable no-console */
import { AppealStatus, AfterSaleStatus, OrderStatus, PrismaClient, ServiceType, WithdrawalStatus, WorkerStatus } from "@prisma/client";

const prisma = new PrismaClient();

// 生成订单编号
function generateOrderNo(date: Date, seq: number): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `CS${dateStr}${seq.toString().padStart(4, "0")}`;
}

const SERVICE_TYPES: ServiceType[] = [
  ServiceType.delivery,
  ServiceType.shopping,
  ServiceType.printing,
  ServiceType.tutoring,
  ServiceType.errand,
  ServiceType.cleaning,
  ServiceType.other,
];

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.delivery]: "代取快递",
  [ServiceType.shopping]: "代购",
  [ServiceType.printing]: "打印复印",
  [ServiceType.tutoring]: "辅导答疑",
  [ServiceType.errand]: "跑腿",
  [ServiceType.cleaning]: "清洁服务",
  [ServiceType.other]: "其他",
};

async function main() {
  // 创建用户与地址（短 ID）
  const users: { id: string; openid: string }[] = [];
  for (let i = 0; i < 15; i++) {
    const id = `U${String(i + 1).padStart(3, "0")}`;
    const user = await prisma.user.create({
      data: {
        id,
        openid: `openid_${id}`,
        nickname: `测试用户${i + 1}`,
        phone: `1380000${(100 + i).toString().slice(-3)}`,
        currentRole: i % 2 === 0 ? "user" : "worker",
        addresses: {
          create: [
            {
              detail: `测试地址 ${i + 1} 号楼`,
              label: "默认",
              isDefault: true,
            },
          ],
        },
      },
    });
    users.push(user);
  }

  // 创建兼职者（短 ID）
  const workerStatuses: WorkerStatus[] = [
    WorkerStatus.approved,
    WorkerStatus.approved,
    WorkerStatus.approved,
    WorkerStatus.approved,
    WorkerStatus.approved,
    WorkerStatus.pending,
    WorkerStatus.pending,
    WorkerStatus.rejected,
  ];
  const workers: { id: string; userId: string; status: WorkerStatus; alipayAccount: string | null }[] = [];
  for (let i = 0; i < workerStatuses.length; i++) {
    const user = users[i + 5];
    const status = workerStatuses[i];
    const id = `W${String(i + 1).padStart(3, "0")}`;
    const worker = await prisma.worker.create({
      data: {
        id,
        userId: user.id,
        idCardImage: "/uploads/mock-id.png",
        skills: "跑腿/搬运",
        status,
        statusReason: status === WorkerStatus.rejected ? "资料不完整" : null,
        alipayAccount: `alipay_${i + 1}@example.com`,
        balance: 100 + i * 20,
        isAccepting: status === WorkerStatus.approved,
        phoneVerified: true,
        stats: {
          create: {
            acceptedCount: 5 + i,
            completedCount: 3 + i,
            positiveCount: 4,
            negativeCount: 1,
            totalIncome: 200 + i * 30,
            totalWorkMinutes: 600 + i * 30,
          },
        },
      },
    });
    workers.push({
      id: worker.id,
      userId: worker.userId,
      status: worker.status,
      alipayAccount: worker.alipayAccount,
    });
  }

  const approvedWorkers = workers.filter((w) => w.status === WorkerStatus.approved);

  const workerNeededStatuses: OrderStatus[] = [
    OrderStatus.in_progress,
    OrderStatus.waiting_confirm,
    OrderStatus.completed,
    OrderStatus.aftersale,
    OrderStatus.appealing,
  ];
  const readyStatuses: OrderStatus[] = [
    OrderStatus.pending,
    OrderStatus.in_progress,
    OrderStatus.waiting_confirm,
    OrderStatus.completed,
    OrderStatus.aftersale,
    OrderStatus.appealing,
  ];
  const takenStatuses: OrderStatus[] = [
    OrderStatus.in_progress,
    OrderStatus.waiting_confirm,
    OrderStatus.completed,
    OrderStatus.aftersale,
    OrderStatus.appealing,
  ];
  const serviceCompletedStatuses: OrderStatus[] = [
    OrderStatus.waiting_confirm,
    OrderStatus.completed,
    OrderStatus.aftersale,
    OrderStatus.appealing,
  ];

  // 创建订单（短 ID）- 移除consulting状态，添加cancelled
  const statuses: OrderStatus[] = [
    OrderStatus.unpaid,
    OrderStatus.unpaid,
    OrderStatus.pending,
    OrderStatus.pending,
    OrderStatus.pending,
    OrderStatus.in_progress,
    OrderStatus.in_progress,
    OrderStatus.in_progress,
    OrderStatus.waiting_confirm,
    OrderStatus.waiting_confirm,
    OrderStatus.waiting_confirm,
    OrderStatus.completed,
    OrderStatus.completed,
    OrderStatus.completed,
    OrderStatus.completed,
    OrderStatus.cancelled,
    OrderStatus.cancelled,
    OrderStatus.aftersale,
    OrderStatus.aftersale,
    OrderStatus.appealing,
  ];

  const orders = [];
  const today = new Date();
  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const user = users[i % users.length];
    const worker = approvedWorkers[i % approvedWorkers.length];
    const needsWorker = workerNeededStatuses.includes(status);
    const id = `O${String(i + 1).padStart(3, "0")}`;
    const serviceType = SERVICE_TYPES[i % SERVICE_TYPES.length];
    const order = await prisma.order.create({
      data: {
        id,
        orderNo: generateOrderNo(today, i + 1),
        userId: user.id,
        workerId: needsWorker ? worker.id : null,
        serviceType,
        type: SERVICE_TYPE_LABELS[serviceType],
        title: `校园服务订单 ${i + 1}`,
        description: `测试订单描述 ${i + 1}`,
        amount: 20 + i * 5,
        status,
        address: `测试地址${i + 1} 栋`,
        expectedTime: `明天 ${9 + (i % 4)}:00-${10 + (i % 4)}:00`,
        contactName: `联系人${i + 1}`,
        contactPhone: `1380000${(200 + i).toString().slice(-3)}`,
        images: [`/uploads/order-${i + 1}-1.png`, `/uploads/order-${i + 1}-2.png`],
        paidAt: status !== "unpaid" ? new Date() : null,
        readyAt: readyStatuses.includes(status)
          ? new Date()
          : null,
        takenAt: takenStatuses.includes(status)
          ? new Date()
          : null,
        serviceCompletedAt: serviceCompletedStatuses.includes(status) ? new Date() : null,
        confirmedAt: status === OrderStatus.completed ? new Date() : null,
        cancelledAt: status === OrderStatus.cancelled ? new Date() : null,
        cancelReason: status === OrderStatus.cancelled ? "用户主动取消" : null,
        cancelledBy: status === OrderStatus.cancelled ? "user" : null,
      },
    });
    orders.push(order);
  }

  // 创建评价
  for (const order of orders.filter((o) => o.status === OrderStatus.completed)) {
    await prisma.review.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        rating: 4,
        content: "服务不错，五星推荐",
        isPositive: true,
      },
    });
  }

  // 创建售后
  for (const order of orders.filter((o) => o.status === OrderStatus.aftersale)) {
    await prisma.afterSale.create({
      data: {
        orderId: order.id,
        reason: "需要返工处理",
        status: AfterSaleStatus.pending,
      },
    });
  }

  // 创建申诉
  for (const order of orders.filter((o) => o.status === OrderStatus.appealing)) {
    await prisma.appeal.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        reason: "对服务不满意",
        status: AppealStatus.pending,
      },
    });
  }

  // 创建提现记录
  for (let i = 0; i < approvedWorkers.length; i++) {
    const worker = approvedWorkers[i];
    await prisma.withdrawal.create({
      data: {
        workerId: worker.id,
        amount: 50 + i * 10,
        status: i % 2 === 0 ? WithdrawalStatus.pending : WithdrawalStatus.paid,
        alipayAccount: worker.alipayAccount || `alipay_${worker.id}@example.com`,
      },
    });
  }

  console.log("Seed data inserted:");
  console.log(`Users: ${users.length}, Workers: ${workers.length}, Orders: ${orders.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
