import { randomBytes, randomInt, createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appendAudit } from "@/lib/audit";
import { analyzeRing } from "@/lib/geo";
import { HttpError, clientIp, ok, requireRole, route } from "@/lib/api";
import { APP_STATUSES, DOC_KINDS, MAX_FILE_BYTES, MAX_TOTAL_BYTES, PERMIT_LABEL, PERMIT_TYPES, PROVINCES, SUBSTANCES, type AppStatus, type DocKind } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const auth = await requireRole(["ADMIN", "INSPECTOR", "APPLICANT"]);
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const where: Prisma.ApplicationWhereInput = {};
  if (user.role === "APPLICANT") where.applicantId = user.id;
  if (status && (APP_STATUSES as readonly string[]).includes(status)) where.status = status as AppStatus;
  if (q) where.OR = [{ ref: { contains: q, mode: "insensitive" } }, { title: { code: { contains: q, mode: "insensitive" } } }, { applicant: { company: { contains: q, mode: "insensitive" } } }];

  const rows = await prisma.application.findMany({
    where, orderBy: { submittedAt: "desc" }, take: 300,
    select: {
      id: true, ref: true, status: true, submittedAt: true, opinion: true,
      applicant: { select: { name: true, company: true } },
      title: { select: { id: true, code: true, type: true, substances: true, areaHa: true, province: true, locality: true, status: true } },
    },
  });
  return ok({ applications: rows });
});

const fieldsSchema = z.object({
  permitType: z.enum(PERMIT_TYPES, { errorMap: () => ({ message: "Type de permis invalide." }) }),
  substances: z.array(z.enum(SUBSTANCES)).min(1, "Sélectionnez au moins une substance."),
  province: z.enum(PROVINCES, { errorMap: () => ({ message: "Province invalide." }) }),
  locality: z.string().trim().min(2, "Localité requise.").max(80),
  ring: z.array(z.array(z.number()).length(2)),
});

function sniff(b: Buffer): string | null {
  if (b.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
  if (b[0] === 0x89 && b.subarray(1, 4).toString("latin1") === "PNG") return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  return null;
}
const json = (v: FormDataEntryValue | null) => { try { return JSON.parse(String(v ?? "null")); } catch { throw new HttpError(400, "Formulaire invalide."); } };
const DOC_NAME: Record<DocKind, string> = { STATUTS: "statuts de l'entreprise", RCCM: "RCCM", EIE: "étude d'impact environnemental", AUTRE: "pièce complémentaire" };

export const POST = route(async (req: Request) => {
  const auth = await requireRole(["APPLICANT"]);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const form = await req.formData();
  const f = fieldsSchema.parse({
    permitType: form.get("permitType"), substances: json(form.get("substances")), province: form.get("province"),
    locality: form.get("locality"), ring: json(form.get("ring")),
  });

  const required: DocKind[] = f.permitType === "EXPLOITATION" ? ["STATUTS", "RCCM", "EIE"] : ["STATUTS", "RCCM"];
  const docs: { kind: DocKind; filename: string; mime: string; size: number; sha256: string; data: Buffer }[] = [];
  let total = 0;
  for (const kind of DOC_KINDS) {
    const file = form.get(`doc_${kind}`);
    if (!(file instanceof File) || file.size === 0) {
      if (required.includes(kind)) throw new HttpError(400, `Pièce obligatoire manquante : ${DOC_NAME[kind]}.`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) throw new HttpError(413, `« ${file.name} » dépasse 3 Mo.`);
    total += file.size;
    const data = Buffer.from(await file.arrayBuffer());
    const mime = sniff(data);
    if (!mime) throw new HttpError(415, `« ${file.name} » : format non accepté (PDF, PNG ou JPEG uniquement).`);
    docs.push({ kind, filename: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120), mime, size: data.length, sha256: createHash("sha256").update(data).digest("hex"), data });
  }
  if (total > MAX_TOTAL_BYTES) throw new HttpError(413, "Taille totale des pièces limitée à 4 Mo.");

  const year = new Date().getFullYear();
  const ref = `DEM-${year}-${randomInt(10000, 99999)}`;
  const code = `${f.permitType === "RESEARCH" ? "PR" : "PE"}-${year}-${randomBytes(2).toString("hex").toUpperCase()}`;

  const result = await prisma.$transaction(async (tx) => {
    // Verrou consultatif : deux dépôts simultanés ne peuvent pas se chevaucher sans être vus.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;
    const a = await analyzeRing(tx, f.ring);
    if (!a.ok || !a.geojson) throw new HttpError(422, a.error ?? "Polygone invalide.");
    if (a.conflicts.length)
      throw new HttpError(409, `Chevauchement détecté avec ${a.conflicts.map((c) => c.code).join(", ")} : dépôt bloqué.`, { conflicts: a.conflicts });

    const title = await tx.title.create({
      data: { code, type: f.permitType, status: "PENDING", substances: f.substances, holderName: user.company ?? user.name, holderId: user.id, province: f.province, locality: f.locality },
    });
    await tx.$executeRaw`UPDATE "Title" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${a.geojson}::text), 4326), "areaHa" = ${a.areaHa} WHERE id = ${title.id}`;
    const app = await tx.application.create({ data: { ref, applicantId: user.id, titleId: title.id } });
    await tx.document.createMany({ data: docs.map((d) => ({ ...d, applicationId: app.id })) });
    await appendAudit(tx, {
      action: "APPLICATION_SUBMITTED", entity: "Application", entityId: ref, toStatus: "SUBMITTED",
      details: `${PERMIT_LABEL[f.permitType]} — ${a.areaHa} ha — ${code}`, actor: user, ip: clientIp(req),
    });
    return { id: app.id, ref, code, areaHa: a.areaHa };
  }, { timeout: 20000 });

  return ok(result, 201);
});
