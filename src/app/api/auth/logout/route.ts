import { logAudit } from "@/lib/prisma";
import { clientIp, ok, route } from "@/lib/api";
import { clearSessionCookie, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const POST = route(async (req: Request) => {
  const user = await getSessionUser();
  if (user) await logAudit({ action: "LOGOUT", actor: { id: user.id, name: user.name, role: user.role }, ip: clientIp(req) });
  clearSessionCookie();
  return ok({ ok: true });
});
