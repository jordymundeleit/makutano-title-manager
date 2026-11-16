import { prisma } from "./prisma";
import { EXPIRY_CRITICAL_DAYS, EXPIRY_SOON_DAYS, FEE_SOON_DAYS } from "./constants";
import { fmtDate, fmtUsd2 } from "./format";
import type { AlertView, FeeRow } from "./types";

const days = (d: Date) => Math.ceil((d.getTime() - Date.now()) / 86_400_000);

export function feeState(dueDate: Date, paidAt: Date | null): FeeRow["state"] {
  if (paidAt) return "PAID";
  const d = days(dueDate);
  return d < 0 ? "OVERDUE" : d <= FEE_SOON_DAYS ? "DUE_SOON" : "UPCOMING";
}

/** Alertes calculées à la demande (toujours à jour). holderId : restreint aux titres d'un demandeur. */
export async function computeAlerts(holderId?: string): Promise<AlertView[]> {
  const titleScope = { status: "ATTRIBUTED" as const, ...(holderId ? { holderId } : {}) };
  const [fees, titles] = await Promise.all([
    prisma.feePayment.findMany({
      where: { paidAt: null, title: titleScope },
      include: { title: { select: { id: true, code: true, holderName: true } } },
    }),
    prisma.title.findMany({
      where: { ...titleScope, expiresAt: { lt: new Date(Date.now() + EXPIRY_SOON_DAYS * 86_400_000) } },
      select: { id: true, code: true, holderName: true, expiresAt: true },
    }),
  ]);

  const out: AlertView[] = [];
  for (const f of fees) {
    const d = days(f.dueDate);
    if (d > FEE_SOON_DAYS) continue;
    out.push({
      id: `fee-${f.id}`, kind: d < 0 ? "FEE_OVERDUE" : "FEE_DUE_SOON", severity: d < 0 ? "critical" : "warning",
      titleId: f.title.id, titleCode: f.title.code, holderName: f.title.holderName, feeId: f.id, amountUsd: f.amountUsd,
      date: f.dueDate.toISOString(), daysLeft: d,
      message: d < 0
        ? `Redevance ${f.year} impayée : ${fmtUsd2(f.amountUsd)} échus depuis ${-d} jour${-d > 1 ? "s" : ""}.`
        : `Redevance ${f.year} de ${fmtUsd2(f.amountUsd)} à payer avant le ${fmtDate(f.dueDate)} (J-${d}).`,
    });
  }
  for (const t of titles) {
    if (!t.expiresAt) continue;
    const d = days(t.expiresAt);
    out.push({
      id: `exp-${t.id}`, kind: d < 0 ? "TITLE_EXPIRED" : "TITLE_EXPIRING", severity: d < 0 || d <= EXPIRY_CRITICAL_DAYS ? "critical" : "warning",
      titleId: t.id, titleCode: t.code, holderName: t.holderName, date: t.expiresAt.toISOString(), daysLeft: d,
      message: d < 0 ? `Titre expiré depuis le ${fmtDate(t.expiresAt)}.` : `Le titre expire le ${fmtDate(t.expiresAt)} (J-${d}).`,
    });
  }
  return out.sort((a, b) => (a.severity === b.severity ? a.daysLeft - b.daysLeft : a.severity === "critical" ? -1 : 1));
}
