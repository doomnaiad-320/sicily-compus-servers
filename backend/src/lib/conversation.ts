import { Prisma, WorkerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const conversationParticipantInclude = {
  user: {
    select: {
      id: true,
      nickname: true,
    },
  },
  worker: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          nickname: true,
        },
      },
    },
  },
  order: {
    select: {
      id: true,
      status: true,
    },
  },
} satisfies Prisma.ConversationInclude;

export type ConversationWithParticipants = Prisma.ConversationGetPayload<{
  include: typeof conversationParticipantInclude;
}>;

type ResolveConversationResult =
  | {
      ok: true;
      conversation: ConversationWithParticipants;
    }
  | {
      ok: false;
      message: string;
      status: number;
    };

async function upsertOrderConversation(
  orderId: string,
  userId: string,
  workerId: string
) {
  return prisma.conversation.upsert({
    where: {
      orderId_userId_workerId: {
        orderId,
        userId,
        workerId,
      },
    },
    update: {},
    create: {
      orderId,
      userId,
      workerId,
    },
    include: conversationParticipantInclude,
  });
}

export async function getConversationForUser(
  conversationId: string,
  authUserId: string
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationParticipantInclude,
  });

  if (!conversation) {
    return null;
  }

  if (
    conversation.userId !== authUserId &&
    conversation.worker.userId !== authUserId
  ) {
    return null;
  }

  return conversation;
}

export async function resolveOrderConversationForUser(
  orderId: string,
  authUserId: string
): Promise<ResolveConversationResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      worker: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!order) {
    return { ok: false, message: "订单不存在", status: 404 };
  }

  if (order.userId === authUserId) {
    if (!order.workerId) {
      return {
        ok: false,
        message: "待接单订单需要兼职者先发起私信",
        status: 400,
      };
    }

    return {
      ok: true,
      conversation: await upsertOrderConversation(
        order.id,
        order.userId,
        order.workerId
      ),
    };
  }

  if (order.workerId) {
    if (order.worker?.userId !== authUserId) {
      return { ok: false, message: "订单不存在或无权限", status: 404 };
    }

    return {
      ok: true,
      conversation: await upsertOrderConversation(
        order.id,
        order.userId,
        order.workerId
      ),
    };
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: authUserId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!worker) {
    return {
      ok: false,
      message: "请先完成兼职者认证后再私信",
      status: 400,
    };
  }

  if (worker.status !== WorkerStatus.approved) {
    return {
      ok: false,
      message: "兼职者未通过审核",
      status: 400,
    };
  }

  return {
    ok: true,
    conversation: await upsertOrderConversation(order.id, order.userId, worker.id),
  };
}

export function serializeConversationForUser(
  conversation: ConversationWithParticipants,
  authUserId: string
) {
  const isUserSide = conversation.userId === authUserId;
  const counterpartName = isUserSide
    ? conversation.worker.user?.nickname || "兼职者"
    : conversation.user.nickname || "用户";

  return {
    id: conversation.id,
    orderId: conversation.orderId,
    updatedAt: conversation.updatedAt,
    userId: conversation.userId,
    workerId: conversation.workerId,
    workerUserId: conversation.worker.userId,
    userNickname: conversation.user.nickname,
    workerNickname: conversation.worker.user?.nickname || null,
    counterpartName,
    orderStatus: conversation.order?.status || null,
  };
}
