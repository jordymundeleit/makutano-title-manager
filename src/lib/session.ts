// Compatible Edge (middleware) : uniquement `jose`.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./constants";

export const COOKIE_NAME = "mt_session";
export type SessionPayload = { uid: string; role: Role; name: string };

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET manquant en production.");
  return new TextEncoder().encode(secret ?? "dev-secret-not-for-production-use-00000");
}

export async function signToken(p: SessionPayload): Promise<string> {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key());
}

export async function verifyToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
