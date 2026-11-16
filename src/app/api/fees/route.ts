import { prisma } from "@/lib/prisma";
import { feeState } from "@/lib/alerts";
import { ok, requireRole, route } from "@/lib/api";
import type { FeeRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const auth = await requireRole(["ADMIN", "APPLICANT"]);
  if (!auth.ok) return auth.response;
  const rows = await prisma.feePayment.findMany({
    where: { title: { status: "ATTRIBUTED", ...(auth.user.role === "APPLICANT" ? { holderId: auth.user.id } : {}) } },
    include: { title: { select: { id: true, code: true, holderName: true } } },
    orderBy: { dueDate: "asc" }, take: 500,
  });
  const fees: FeeRow[] = rows.map((f) => ({
    id: f.id, year: f.year, amountUsd: f.amountUsd, dueDate: f.dueDate.toISOString(), paidAt: f.paidAt?.toISOString() ?? null,
    reference: f.reference, state: feeState(f.dueDate, f.paidAt), title: f.title,
  }));
  return ok({ fees });
});
