import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const addresses = await prisma.address.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { detail, label, isDefault } = body as {
    detail?: string;
    label?: string | null;
    isDefault?: boolean;
  };

  if (!detail) {
    return NextResponse.json({ message: "detail 不能为空" }, { status: 400 });
  }

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: auth.userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const created = await prisma.address.create({
    data: {
      userId: auth.userId,
      detail,
      label: label || null,
      isDefault: Boolean(isDefault),
    },
  });

  return NextResponse.json(created, { status: 201 });
}
