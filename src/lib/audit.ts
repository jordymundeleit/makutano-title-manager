import type { Prisma, Role } from "@prisma/client";
import { computeAuditHash } from "./hash";

export type Tx = Prisma.TransactionClient;

export type AuditEntry = {
  action: string; entity?: string; entityId?: string; details?: string; fromStatus?: string | null; toStatus?: string | null;
  actor?: { id: string; name: string; role: Role } | null; actorName?: string; ip?: string | null; createdAt?: Date;
};

/** Ajoute une ligne au journal chaîné. À appeler DANS une transaction : le verrou consultatif sérialise la chaîne. */
export async function appendAudit(tx: Tx, e: AuditEntry) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(727002)`;
  const last = await tx.auditLog.findFirst({ orderBy: { seq: "desc" }, select: { hash: true } });
  const createdAt = e.createdAt ?? new Date();
  const base = {
    prevHash: last?.hash ?? null, action: e.action, entity: e.entity ?? null, entityId: e.entityId ?? null,
    details: e.details ?? null, fromStatus: e.fromStatus ?? null, toStatus: e.toStatus ?? null,
    actorId: e.actor?.id ?? null, createdAt: createdAt.toISOString(),
  };
  return tx.auditLog.create({
    data: {
      action: base.action, entity: base.entity, entityId: base.entityId, details: base.details,
      fromStatus: base.fromStatus, toStatus: base.toStatus, actorId: base.actorId,
      actorName: e.actor?.name ?? e.actorName ?? "Système", actorRole: e.actor?.role ?? null,
      ip: e.ip ?? null, createdAt, prevHash: base.prevHash, hash: computeAuditHash(base),
    },
  });
}
