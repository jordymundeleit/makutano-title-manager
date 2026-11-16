import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, logAudit } from "@/lib/prisma";
import { clientIp, fail, ok, route } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({ email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."), password: z.string().min(1, "Mot de passe requis.") });
const DUMMY = bcrypt.hashSync("dummy-password", 10);

export const POST = route(async (req: Request) => {
  const { email, password } = schema.parse(await req.json().catch(() => ({})));
  const ip = clientIp(req);
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);
  if (!user || !valid || !user.active) {
    await logAudit({ action: "LOGIN_FAILED", details: `Tentative sur ${email}`, actorName: email, ip });
    return fail("Identifiants invalides ou compte désactivé.", 401);
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie({ uid: user.id, role: user.role, name: user.name });
  await logAudit({ action: "LOGIN", actor: { id: user.id, name: user.name, role: user.role }, ip });
  return ok({ redirect: user.role === "APPLICANT" ? "/applicant" : "/admin" });
});
