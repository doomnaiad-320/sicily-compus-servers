import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/request";

function isPng(url: string) {
  return url.toLowerCase().endsWith(".png");
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { idCardImage, phone, code, skills, alipayAccount } = body as {
    idCardImage?: string;
    phone?: string;
    code?: string;
    skills?: string;
    alipayAccount?: string;
  };

  if (!idCardImage || !isPng(idCardImage)) {
    return NextResponse.json({ message: "请上传 png 格式身份证图片" }, { status: 400 });
  }
  if (!phone || phone.length < 6) {
    return NextResponse.json({ message: "手机号格式不正确" }, { status: 400 });
  }
  if (code !== "1111") {
    return NextResponse.json({ message: "验证码错误" }, { status: 400 });
  }

  const worker = await prisma.worker.findUnique({
    where: { userId: auth.userId! },
  });

  if (worker && (worker.status === "pending" || worker.status === "approved")) {
    return NextResponse.json({ message: "当前状态不可重复申请" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const target = worker
      ? await tx.worker.update({
          where: { userId: auth.userId! },
          data: {
            idCardImage,
            skills: skills || "",
            status: "pending",
            statusReason: null,
            alipayAccount: alipayAccount || null,
            phoneVerified: true,
          },
        })
      : await tx.worker.create({
          data: {
            id: auth.userId!, // 使用用户 ID 作为兼职者 ID，一人一个 ID
            userId: auth.userId!,
            idCardImage,
            skills: skills || "",
            status: "pending",
            statusReason: null,
            alipayAccount: alipayAccount || null,
            phoneVerified: true,
            stats: { create: {} },
          },
        });

    return target;
  });

  return NextResponse.json(result, { status: 201 });
}
