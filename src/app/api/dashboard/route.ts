import { prisma } from "@/lib/prisma";
import { computeAlerts } from "@/lib/alerts";
import { ok, requireRole, route } from "@/lib/api";
import { MAP_STATUSES, PROVINCES } from "@/lib/constants";

export const dynamic = "force-dynamic";
const r1 = (n: number) => Math.round(n * 10) / 10;

export const GET = route(async () => {
  const auth = await requireRole(["ADMIN", "INSPECTOR"]);
  if (!auth.ok) return auth.response;

  const [titles, apps, fees, alerts] = await Promise.all([
    prisma.title.findMany({ where: { status: { in: [...MAP_STATUSES] } }, select: { status: true, province: true, areaHa: true } }),
    prisma.application.groupBy({ by: ["status"], _count: true }),
    prisma.feePayment.findMany({ where: { title: { status: "ATTRIBUTED" } }, select: { amountUsd: true, paidAt: true, dueDate: true } }),
    computeAlerts(),
  ]);

  const now = Date.now();
  let collected = 0, outstanding = 0, overdue = 0;
  for (const f of fees) {
    if (f.paidAt) collected += f.amountUsd;
    else { outstanding += f.amountUsd; if (f.dueDate.getTime() < now) overdue += f.amountUsd; }
  }
  const attributed = titles.filter((t) => t.status === "ATTRIBUTED");
  const appCount = (s: string) => apps.find((a) => a.status === s)?._count ?? 0;

  const byProvince = PROVINCES.map((p) => {
    const row: Record<string, number | string> = { province: p };
    for (const s of MAP_STATUSES) row[s] = r1(titles.filter((t) => t.province === p && t.status === s).reduce((a, t) => a + (t.areaHa ?? 0), 0));
    return row;
  });

  return ok({
    kpis: {
      attributed: attributed.length,
      attributedAreaHa: Math.round(attributed.reduce((a, t) => a + (t.areaHa ?? 0), 0)),
      freeAreaHa: Math.round(titles.filter((t) => t.status === "FREE").reduce((a, t) => a + (t.areaHa ?? 0), 0)),
      pending: appCount("SUBMITTED") + appCount("IN_INSTRUCTION") + appCount("INSTRUCTED"),
      toTake: appCount("SUBMITTED"), toDecide: appCount("INSTRUCTED"),
      feesCollected: Math.round(collected), feesOutstanding: Math.round(outstanding), feesOverdue: Math.round(overdue),
    },
    byProvince, alerts,
  });
});
