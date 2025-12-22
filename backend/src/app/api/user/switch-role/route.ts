import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";
import { signUserToken } from "@/lib/auth";

const allowedRoles = ["user", "worker"] as const;

export async function PUT(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { role } = body as { role?: (typeof allowedRoles)[number] };

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.json({ message: "role 必须是 user 或 worker" }, { status: 400 });
  }

  // Ensure worker record exists when切换到兼职者
  if (role === "worker") {
    const existingWorker = await prisma.worker.findUnique({
      where: { userId: auth.userId },
    });
    if (!existingWorker) {
      await prisma.worker.create({
        data: {
          userId: auth.userId,
          status: "none",
          stats: {
            create: {},
          },
        },
      });
    }
  }

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data: { currentRole: role },
  });

  const token = await signUserToken({
    userId: updated.id,
    openid: updated.openid,
    role: updated.currentRole,
  });

  return NextResponse.json({
    id: updated.id,
    currentRole: updated.currentRole,
    token,
  });
}
