import { prisma } from "@/lib/prisma";
import { appendAudit } from "@/lib/audit";
import { HttpError, clientIp, ok, requireRole, route } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Constate l'expiration d'un titre échu : la zone cesse de bloquer les nouvelles demandes. */
export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  await prisma.$transaction(async (tx) => {
    const t = await tx.title.findUnique({ where: { id: params.id } });
    if (!t) throw new HttpError(404, "Titre introuvable.");
    if (t.status !== "ATTRIBUTED" || !t.expiresAt || t.expiresAt > new Date()) throw new HttpError(409, "Ce titre n'est pas échu.");
    await tx.title.update({ where: { id: t.id }, data: { status: "EXPIRED" } });
    await appendAudit(tx, { action: "TITLE_EXPIRED", entity: "Title", entityId: t.code, fromStatus: "ATTRIBUTED", toStatus: "EXPIRED", details: `Expiration constatée — ${t.holderName ?? "titulaire inconnu"}`, actor: auth.user, ip: clientIp(req) });
  });
  return ok({ ok: true });
});
