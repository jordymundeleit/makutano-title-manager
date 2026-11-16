import { prisma } from "@/lib/prisma";
import { findConflicts, titleGeometry } from "@/lib/geo";
import { HttpError, ok, requireRole, route } from "@/lib/api";
import type { ApplicationDetailData } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireRole(["ADMIN", "INSPECTOR", "APPLICANT"]);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      applicant: { select: { name: true, company: true, rccm: true, email: true } },
      title: { select: { id: true, code: true, type: true, substances: true, areaHa: true, province: true, locality: true, status: true, expiresAt: true } },
      documents: { select: { id: true, kind: true, filename: true, size: true, sha256: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!app) throw new HttpError(404, "Dossier introuvable.");
  if (user.role === "APPLICANT" && app.applicantId !== user.id) throw new HttpError(403, "Ce dossier ne vous appartient pas.");

  const geometry = await titleGeometry(prisma, app.titleId);
  const live = ["SUBMITTED", "IN_INSTRUCTION", "INSTRUCTED"].includes(app.status);
  const conflicts = geometry && live && user.role !== "APPLICANT" ? await findConflicts(prisma, JSON.stringify(geometry), app.titleId) : [];
  const history = await prisma.auditLog.findMany({
    where: { entity: "Application", entityId: app.ref }, orderBy: { seq: "asc" },
    select: { id: true, action: true, fromStatus: true, toStatus: true, details: true, actorName: true, actorRole: true, createdAt: true },
  });

  const body: ApplicationDetailData = {
    application: {
      id: app.id, ref: app.ref, status: app.status, submittedAt: app.submittedAt.toISOString(), opinion: app.opinion, opinionNote: app.opinionNote,
      decisionNote: app.decisionNote, decidedByName: app.decidedByName, decidedAt: app.decidedAt?.toISOString() ?? null, instructorName: app.instructorName,
      applicant: app.applicant,
      title: { ...app.title, expiresAt: app.title.expiresAt?.toISOString() ?? null },
    },
    geometry, conflicts, documents: app.documents,
    history: history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
  };
  return ok(body);
});
