import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { detail, label, isDefault } = body as {
    detail?: string;
    label?: string | null;
    isDefault?: boolean;
  };

  const address = await prisma.address.findFirst({
    where: { id: params.id, userId: auth.userId },
  });

  if (!address) {
    return NextResponse.json({ message: "地址不存在" }, { status: 404 });
  }

  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: auth.userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.address.update({
    where: { id: params.id },
    data: {
      ...(detail !== undefined ? { detail } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const address = await prisma.address.findFirst({
    where: { id: params.id, userId: auth.userId },
  });

  if (!address) {
    return NextResponse.json({ message: "地址不存在" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
