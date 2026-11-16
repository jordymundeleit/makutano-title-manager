import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

import { appendAudit, type AuditEntry } from "./audit";
/** Journalise hors transaction métier (connexion, déconnexion…). */
export function logAudit(e: AuditEntry) {
  return prisma.$transaction((tx) => appendAudit(tx, e));
}
