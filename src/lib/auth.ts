import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { COOKIE_NAME, signToken, verifyToken, type SessionPayload } from "./session";

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signToken(payload);
  cookies().set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
}
export function clearSessionCookie() { cookies().delete(COOKIE_NAME); }

/** Utilisateur courant (relu en base : un compte désactivé perd l'accès). Renvoie null si anonyme. */
export async function getSessionUser() {
  const session = await verifyToken(cookies().get(COOKIE_NAME)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { id: true, name: true, email: true, role: true, active: true, company: true, rccm: true },
  });
  return user && user.active ? user : null;
}
export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
