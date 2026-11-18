import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, logAudit } from "@/lib/prisma";
import { clientIp, fail, ok, route } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
  role: z.enum(["ADMIN", "INSPECTOR", "APPLICANT"]).optional(),
});

const DEMO_PASSWORD_CODE = "Makutano2026";
const DUMMY = bcrypt.hashSync("dummy-password", 10);

export const POST = route(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return fail("Données invalides.", 400);
  }

  const { email, password, role } = parsed.data;
  const ip = clientIp(req);

  let user = await prisma.user.findUnique({ where: { email } });
  let isValidPassword = false;

  if (user) {
    if (password === DEMO_PASSWORD_CODE) {
      isValidPassword = true;
    } else {
      isValidPassword = await bcrypt.compare(password, user.passwordHash ?? DUMMY);
    }
  } else {
    if (password === DEMO_PASSWORD_CODE) {
      const assignedRole = role || "APPLICANT";
      const generatedPasswordHash = await bcrypt.hash(Math.random().toString(), 10);
      
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          passwordHash: generatedPasswordHash,
          role: assignedRole,
          active: true,
        },
      });
      isValidPassword = true;
    }
  }

  if (!user || !isValidPassword || !user.active) {
    await logAudit({
      action: "LOGIN_FAILED",
      details: `Tentative échouée sur ${email}`,
      ip,
    });
    return fail("Identifiants invalides ou code d'accès incorrect.", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await setSessionCookie({ uid: user.id, role: user.role, name: user.name });

  await logAudit({
    action: "LOGIN_DEMO_SUCCESS",
    actor: { id: user.id, name: user.name, role: user.role },
    details: `Connexion démo réussie via IP ${ip}`,
    ip,
  });

  const redirectPath = user.role === "APPLICANT" ? "/applicant" : "/admin";
  return ok({ redirect: redirectPath });
});