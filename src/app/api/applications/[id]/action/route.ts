import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appendAudit } from "@/lib/audit";
import { findConflicts, titleGeometry } from "@/lib/geo";
import { HttpError, clientIp, ok, requireRole, route } from "@/lib/api";
import { FEE_RATE_USD_PER_HA, VALIDITY_YEARS, type Role } from "@/lib/constants";
import type { ApplicationStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["TAKE", "INSTRUCT", "APPROVE", "REJECT"]),
  opinion: z.enum(["FAVORABLE", "UNFAVORABLE"]).optional(),
  note: z.string().trim().max(1000, "Texte trop long (1000 caractères max).").optional(),
});

export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const body = schema.parse(await req.json().catch(() => ({})));
  const roles: Role[] = body.action === "TAKE" || body.action === "INSTRUCT" ? ["INSPECTOR"] : ["ADMIN"];
  const auth = await requireRole(roles);
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const ip = clientIp(req);
  const note = body.note?.trim() ?? "";

  const status = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;
    const app = await tx.application.findUnique({ where: { id: params.id }, include: { title: true } });
    if (!app) throw new HttpError(404, "Dossier introuvable.");

    // Changement de statut atomique : refuse si le dossier a bougé entre-temps.
    const move = async (from: ApplicationStatus[], data: Prisma.ApplicationUpdateManyMutationInput) => {
      const r = await tx.application.updateMany({ where: { id: app.id, status: { in: from } }, data });
      if (r.count === 0) throw new HttpError(409, "Le statut du dossier a changé entre-temps. Actualisez la page.");
    };

    if (body.action === "TAKE") {
      await move(["SUBMITTED"], { status: "IN_INSTRUCTION", instructorId: user.id, instructorName: user.name });
      await appendAudit(tx, { action: "APPLICATION_TAKEN", entity: "Application", entityId: app.ref, fromStatus: "SUBMITTED", toStatus: "IN_INSTRUCTION", details: "Dossier pris en charge pour instruction technique.", actor: user, ip });
      return "IN_INSTRUCTION";
    }

    if (body.action === "INSTRUCT") {
      if (!body.opinion) throw new HttpError(400, "Choisissez un avis (favorable ou défavorable).");
      if (note.length < 10) throw new HttpError(400, "Motivez votre avis technique (10 caractères minimum).");
      await move(["IN_INSTRUCTION"], { status: "INSTRUCTED", opinion: body.opinion, opinionNote: note });
      await appendAudit(tx, { action: "APPLICATION_INSTRUCTED", entity: "Application", entityId: app.ref, fromStatus: "IN_INSTRUCTION", toStatus: "INSTRUCTED", details: `Avis ${body.opinion === "FAVORABLE" ? "favorable" : "défavorable"} : ${note}`, actor: user, ip });
      return "INSTRUCTED";
    }

    const open: ApplicationStatus[] = ["SUBMITTED", "IN_INSTRUCTION", "INSTRUCTED"];
    if (body.action === "REJECT") {
      if (note.length < 10) throw new HttpError(400, "Un rejet doit être motivé (10 caractères minimum).");
      await move(open, { status: "REJECTED", decidedById: user.id, decidedByName: user.name, decidedAt: new Date(), decisionNote: note });
      await tx.title.update({ where: { id: app.titleId }, data: { status: "REJECTED" } });
      await appendAudit(tx, { action: "APPLICATION_REJECTED", entity: "Application", entityId: app.ref, fromStatus: app.status, toStatus: "REJECTED", details: note, actor: user, ip });
      return "REJECTED";
    }

    // APPROVE : revérification géospatiale au moment de l'octroi
    const geom = await titleGeometry(tx, app.titleId);
    if (!geom) throw new HttpError(422, "Géométrie du périmètre introuvable.");
    const conflicts = await findConflicts(tx, JSON.stringify(geom), app.titleId);
    if (conflicts.length) throw new HttpError(409, `Octroi impossible : chevauchement avec ${conflicts.map((c) => c.code).join(", ")}.`, { conflicts });
    if (!app.title.type) throw new HttpError(422, "Type de permis manquant.");

    const now = new Date();
    const expires = new Date(now); expires.setFullYear(expires.getFullYear() + VALIDITY_YEARS[app.title.type]);
    await move(open, { status: "APPROVED", decidedById: user.id, decidedByName: user.name, decidedAt: now, decisionNote: note || "Dossier conforme. Titre octroyé." });
    await tx.title.update({ where: { id: app.titleId }, data: { status: "ATTRIBUTED", grantedAt: now, expiresAt: expires } });
    const due = new Date(now.getTime() + 30 * 86_400_000);
    await tx.feePayment.create({ data: { titleId: app.titleId, year: due.getFullYear(), amountUsd: Math.round((app.title.areaHa ?? 0) * FEE_RATE_USD_PER_HA[app.title.type] * 100) / 100, dueDate: due } });
    await appendAudit(tx, { action: "APPLICATION_APPROVED", entity: "Application", entityId: app.ref, fromStatus: app.status, toStatus: "APPROVED", details: `Titre ${app.title.code} octroyé, valable jusqu'au ${expires.toISOString().slice(0, 10)}.${note ? " " + note : ""}`, actor: user, ip });
    return "APPROVED";
  }, { timeout: 20000 });

  return ok({ status });
});
