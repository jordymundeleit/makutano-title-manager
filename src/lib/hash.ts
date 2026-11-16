import { createHash } from "crypto";

export type AuditHashInput = {
  prevHash: string | null; action: string; entity: string | null; entityId: string | null; details: string | null;
  fromStatus: string | null; toStatus: string | null; actorId: string | null; createdAt: string;
};

export function computeAuditHash(i: AuditHashInput): string {
  return createHash("sha256")
    .update(JSON.stringify([i.prevHash ?? "GENESIS", i.action, i.entity, i.entityId, i.details, i.fromStatus, i.toStatus, i.actorId, i.createdAt]))
    .digest("hex");
}

/** Parcourt le journal dans l'ordre : chaque ligne doit pointer vers la précédente et se recalculer à l'identique. */
export function verifyAuditChain(rows: (AuditHashInput & { hash: string; seq: number })[]): { valid: boolean; brokenSeq: number | null } {
  for (let i = 0; i < rows.length; i++) {
    const expectedPrev = i === 0 ? null : rows[i - 1].hash;
    if ((rows[i].prevHash ?? null) !== expectedPrev || computeAuditHash(rows[i]) !== rows[i].hash)
      return { valid: false, brokenSeq: rows[i].seq };
  }
  return { valid: true, brokenSeq: null };
}
