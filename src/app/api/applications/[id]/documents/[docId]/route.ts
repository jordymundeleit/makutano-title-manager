import { prisma } from "@/lib/prisma";
import { HttpError, requireRole, route } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, { params }: { params: { id: string; docId: string } }) => {
  const auth = await requireRole(["ADMIN", "INSPECTOR", "APPLICANT"]);
  if (!auth.ok) return auth.response;
  const doc = await prisma.document.findFirst({ where: { id: params.docId, applicationId: params.id }, include: { application: { select: { applicantId: true } } } });
  if (!doc) throw new HttpError(404, "Document introuvable.");
  if (auth.user.role === "APPLICANT" && doc.application.applicantId !== auth.user.id) throw new HttpError(403, "Accès refusé.");
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});
