import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { getSessionUser, type SessionUser } from "./auth";
import type { Role } from "./constants";

export class HttpError extends Error {
  constructor(public status: number, message: string, public data?: Record<string, unknown>) { super(message); }
}
export const ok = <T,>(data: T, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, extra?: Record<string, unknown>) => NextResponse.json({ error: message, ...extra }, { status });
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");

export async function requireRole(roles: readonly Role[]): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, response: fail("Session expirée. Reconnectez-vous.", 401) };
  if (!roles.includes(user.role)) return { ok: false, response: fail("Accès refusé pour votre rôle.", 403) };
  return { ok: true, user };
}

export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.message, e.status, e.data);
      if (e instanceof ZodError) return fail(e.issues[0]?.message ?? "Données invalides.", 400);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("Cette valeur existe déjà.", 409);
      console.error(e);
      return fail("Erreur serveur. Réessayez dans un instant.", 500);
    }
  };
}
