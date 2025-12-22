import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

type UserRole = "user" | "worker" | "admin";

const JWT_ALG = "HS256";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
};

export async function signUserToken(
  payload: { userId: string; role?: UserRole; openid?: string },
  expiresIn = "7d"
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(getSecret());
}

export async function verifyToken(token: string) {
  try {
    const decoded = await jwtVerify(token, getSecret(), {
      algorithms: [JWT_ALG],
    });
    return { valid: true as const, payload: decoded.payload };
  } catch (error) {
    return { valid: false as const, error };
  }
}

export async function verifyJwtFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const [, token] = authHeader.split(" ");

  if (!token) {
    return { ok: false as const, message: "Missing Authorization header" };
  }

  const result = await verifyToken(token);
  if (!result.valid) {
    return { ok: false as const, message: "Invalid token" };
  }

  return {
    ok: true as const,
    userId: (result.payload.userId as string) || "",
    role: (result.payload.role as UserRole) || undefined,
    openid: (result.payload.openid as string) || undefined,
  };
}
