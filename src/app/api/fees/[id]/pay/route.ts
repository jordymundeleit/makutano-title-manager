import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appendAudit } from "@/lib/audit";
import { HttpError, clientIp, ok, requireRole, route } from "@/lib/api";
import { FEE_RATE_USD_PER_HA } from "@/lib/constants";

export const dynamic = "force-dynamic";
const schema = z.object({ reference: z.string().trim().min(3, "Référence de paiement requise (3 caractères min).").max(60) });

export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const { reference } = schema.parse(await req.json().catch(() => ({})));
  await prisma.$transaction(async (tx) => {
    const fee = await tx.feePayment.findUnique({ where: { id: params.id }, include: { title: true } });
    if (!fee) throw new HttpError(404, "Redevance introuvable.");
    const r = await tx.feePayment.updateMany({ where: { id: fee.id, paidAt: null }, data: { paidAt: new Date(), reference, recordedBy: auth.user.name } });
    if (r.count === 0) throw new HttpError(409, "Cette redevance est déjà réglée.");
    // Échéance suivante, tant que le titre est valide
    const next = new Date(fee.dueDate); next.setFullYear(next.getFullYear() + 1);
    if (fee.title.status === "ATTRIBUTED" && fee.title.type && (!fee.title.expiresAt || next < fee.title.expiresAt)) {
      await tx.feePayment.upsert({
        where: { titleId_year: { titleId: fee.titleId, year: next.getFullYear() } }, update: {},
        create: { titleId: fee.titleId, year: next.getFullYear(), dueDate: next, amountUsd: Math.round((fee.title.areaHa ?? 0) * FEE_RATE_USD_PER_HA[fee.title.type] * 100) / 100 },
      });
    }
    await appendAudit(tx, { action: "FEE_PAID", entity: "Title", entityId: fee.title.code, details: `Redevance ${fee.year} : ${fee.amountUsd} USD — réf. ${reference}`, actor: auth.user, ip: clientIp(req) });
  });
  return ok({ ok: true });
});
