import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const uploadDir = path.join(process.cwd(), "public", "uploads");

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "file is required" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ message: "file is empty" }, { status: 400 });
  }

  await ensureUploadDir();

  const ext = path.extname(file.name) || ".bin";
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const url = `/uploads/${filename}`;

  return NextResponse.json(
    {
      filename,
      url,
      size: file.size,
      type: file.type,
    },
    { status: 201 }
  );
}
