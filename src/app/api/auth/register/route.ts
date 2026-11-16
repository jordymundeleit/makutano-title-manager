import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, logAudit } from "@/lib/prisma";
import { clientIp, fail, ok, route } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({
  company: z.string().trim().min(2, "Raison sociale requise.").max(120),
  rccm: z.string().trim().min(5, "Numéro RCCM requis.").max(60),
  name: z.string().trim().min(2, "Nom du représentant requis.").max(80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum.").max(100),
});

export const POST = route(async (req: Request) => {
  const body = schema.parse(await req.json().catch(() => ({})));
  if (await prisma.user.findUnique({ where: { email: body.email } })) return fail("Cette adresse e-mail est déjà utilisée.", 409);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, company: body.company, rccm: body.rccm, role: "APPLICANT", passwordHash: await bcrypt.hash(body.password, 10) },
  });
  await setSessionCookie({ uid: user.id, role: user.role, name: user.name });
  await logAudit({ action: "ACCOUNT_CREATED", entity: "User", entityId: user.id, details: `${body.company} (${body.rccm})`, actor: { id: user.id, name: user.name, role: user.role }, ip: clientIp(req) });
  return ok({ redirect: "/applicant" }, 201);
});
