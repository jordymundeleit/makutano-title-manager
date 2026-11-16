import { prisma } from "@/lib/prisma";
import { verifyAuditChain } from "@/lib/hash";
import { ok, requireRole, route } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const auth = await requireRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const q = new URL(req.url).searchParams.get("q")?.trim();

  const everything = await prisma.auditLog.findMany({ orderBy: { seq: "asc" } });
  const chain = verifyAuditChain(everything.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  const needle = q?.toLowerCase();
  const logs = everything
    .filter((r) => !needle || [r.action, r.actorName, r.details, r.entityId].some((v) => v?.toLowerCase().includes(needle)))
    .reverse().slice(0, 300)
    .map((r) => ({ id: r.id, seq: r.seq, action: r.action, entity: r.entity, entityId: r.entityId, details: r.details, fromStatus: r.fromStatus, toStatus: r.toStatus, actorName: r.actorName, actorRole: r.actorRole, ip: r.ip, createdAt: r.createdAt.toISOString(), hash: r.hash }));
  return ok({ logs, chain: { ...chain, total: everything.length } });
});
