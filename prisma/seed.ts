/* Données de démonstration : lieux réels (Kolwezi, Tenke-Fungurume, Lubumbashi-Kipushi, Walikale, Kamituga),
   sociétés et codes de titres FICTIFS. */
import { PrismaClient, type ApplicationStatus, type PermitType, type Substance } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { appendAudit, type AuditEntry } from "../src/lib/audit";
import { CLUSTERS, rectRing, type ClusterKey } from "../src/lib/demo-geo";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, FEE_RATE_USD_PER_HA, VALIDITY_YEARS } from "../src/lib/constants";

const prisma = new PrismaClient();
const DAY = 86_400_000;
const NOW = Date.now();
const ago = (d: number) => new Date(NOW - d * DAY);

function tinyPdf(text: string): Buffer {
  const esc = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[()\\]/g, " ");
  const stream = `BT /F1 16 Tf 50 780 Td (${esc}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

type Kind = "PE" | "PR" | "FREE" | "RES" | "PEND";
type UKey = "demo" | "cbm" | "wal" | "kiv" | "hkr";
type Blk = {
  c: number; r: number; w: number; h: number; kind: Kind; holder?: string; subs?: Substance[];
  age?: number; exp?: number; fee?: "paid" | "soon" | "overdue"; app?: ApplicationStatus; user?: UKey; pt?: PermitType;
};

const BLOCKS: Record<ClusterKey, Blk[]> = {
  KOL: [
    { c: 0, r: 0, w: 5, h: 4, kind: "PE", holder: "Société Minière du Lualaba (SOMILU)", subs: ["COBALT", "COPPER"], age: 1500, fee: "paid" },
    { c: 5, r: 0, w: 4, h: 3, kind: "PE", holder: "Kolwezi Copper Resources SA", subs: ["COPPER", "COBALT"], age: 900, fee: "soon" },
    { c: 9, r: 0, w: 5, h: 5, kind: "PR", holder: "Katanga Explorations SARL", subs: ["COBALT"], age: 1500, exp: 70, fee: "overdue" },
    { c: 0, r: 4, w: 3, h: 3, kind: "PEND", subs: ["COBALT"], app: "IN_INSTRUCTION", user: "demo" },
    { c: 3, r: 4, w: 2, h: 3, kind: "FREE" },
    { c: 5, r: 3, w: 4, h: 4, kind: "RES", holder: "Zone réservée — Patrimoine de l'État" },
    { c: 9, r: 5, w: 5, h: 3, kind: "PR", holder: "Mutoshi Prospection SARL", subs: ["COPPER"], age: 400, fee: "paid" },
    { c: 0, r: 7, w: 5, h: 3, kind: "FREE" },
    { c: 5, r: 7, w: 4, h: 3, kind: "PEND", subs: ["COBALT"], app: "SUBMITTED", user: "cbm", pt: "EXPLOITATION" },
    { c: 9, r: 8, w: 5, h: 2, kind: "FREE" },
  ],
  TFM: [
    { c: 0, r: 0, w: 6, h: 4, kind: "PE", holder: "Tenke Fungurume Mining Partners SA", subs: ["COPPER", "COBALT"], age: 2400, fee: "paid" },
    { c: 6, r: 0, w: 6, h: 3, kind: "PR", holder: "Lualaba Cobalt Ventures SARL", subs: ["COBALT"], age: 700, fee: "soon", user: "demo" },
    { c: 0, r: 4, w: 4, h: 4, kind: "FREE" },
    { c: 4, r: 4, w: 4, h: 2, kind: "RES", holder: "Zone réservée — Aire de protection" },
    { c: 8, r: 3, w: 4, h: 3, kind: "PR", holder: "Fungurume Exploration Group", subs: ["COBALT", "COPPER"], age: 300, fee: "paid" },
    { c: 4, r: 6, w: 8, h: 2, kind: "FREE" },
  ],
  LUB: [
    { c: 0, r: 0, w: 4, h: 4, kind: "PE", holder: "Kipushi Mining Services SA", subs: ["COPPER"], age: 3000, exp: 140, fee: "paid" },
    { c: 4, r: 0, w: 4, h: 3, kind: "PE", holder: "Étoile Minerais SARL", subs: ["COPPER", "COBALT"], age: 800, fee: "overdue" },
    { c: 8, r: 0, w: 4, h: 4, kind: "PR", holder: "Lubumbashi Exploration SARL", subs: ["COPPER"], age: 300, fee: "paid" },
    { c: 0, r: 4, w: 4, h: 2, kind: "PEND", subs: ["COPPER"], app: "INSTRUCTED", user: "hkr" },
    { c: 4, r: 3, w: 4, h: 3, kind: "FREE" },
    { c: 0, r: 6, w: 6, h: 2, kind: "FREE" },
    { c: 8, r: 4, w: 4, h: 4, kind: "PR", holder: "Kalukuluku Mining (titre échu)", subs: ["COPPER"], age: 2000, exp: -20, fee: "paid" },
  ],
  WAL: [
    { c: 0, r: 0, w: 4, h: 3, kind: "PE", holder: "Coopérative Minière de Walikale (COMIWA)", subs: ["COLTAN"], age: 1200, fee: "soon" },
    { c: 4, r: 0, w: 3, h: 3, kind: "PR", holder: "Walikale Coltan Group SARL", subs: ["COLTAN"], age: 500, fee: "paid", user: "wal" },
    { c: 7, r: 0, w: 3, h: 4, kind: "RES", holder: "Zone réservée — Réserve foncière communautaire" },
    { c: 0, r: 3, w: 4, h: 4, kind: "FREE" },
    { c: 4, r: 3, w: 3, h: 2, kind: "PEND", subs: ["COLTAN"], app: "SUBMITTED", user: "wal" },
    { c: 4, r: 5, w: 3, h: 2, kind: "FREE" },
    { c: 7, r: 4, w: 3, h: 3, kind: "FREE" },
  ],
  KAM: [
    { c: 0, r: 0, w: 5, h: 3, kind: "PE", holder: "Kivu Gold Partners SA", subs: ["GOLD"], age: 1800, fee: "paid", user: "kiv" },
    { c: 5, r: 0, w: 5, h: 4, kind: "PR", holder: "Twangiza Sud Prospection SARL", subs: ["GOLD"], age: 600, fee: "soon" },
    { c: 0, r: 3, w: 5, h: 4, kind: "FREE" },
    { c: 5, r: 4, w: 3, h: 3, kind: "PEND", subs: ["GOLD"], app: "IN_INSTRUCTION", user: "kiv" },
    { c: 8, r: 4, w: 2, h: 3, kind: "FREE" },
  ],
};

const COMPANIES: Record<UKey, { name: string; email: string; person: string; rccm: string }> = {
  demo: { name: "Lualaba Cobalt Ventures SARL", email: DEMO_ACCOUNTS.applicant.email, person: "Aimé Kasongo", rccm: "CD/KWZ/RCCM/24-B-0183" },
  cbm: { name: "Congo Battery Metals SARL", email: "contact@cbm.demo", person: "Divine Mutombo", rccm: "CD/LSH/RCCM/23-B-0912" },
  wal: { name: "Walikale Coltan Group SARL", email: "contact@wcg.demo", person: "Patient Mumbere", rccm: "CD/GOM/RCCM/22-B-0455" },
  kiv: { name: "Kivu Gold Partners SA", email: "contact@kgp.demo", person: "Claudine Bahati", rccm: "CD/BKV/RCCM/21-B-0277" },
  hkr: { name: "Haut-Katanga Resources SARL", email: "contact@hkr.demo", person: "Olivier Kabeya", rccm: "CD/LSH/RCCM/25-B-0031" },
};

type Ev = { at: Date; e: AuditEntry };

async function main() {
  console.log("Nettoyage de la base…");
  await prisma.$executeRaw`TRUNCATE TABLE "AuditLog", "Document", "Application", "FeePayment", "Title", "User" RESTART IDENTITY CASCADE`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS title_geom_gix ON "Title" USING GIST (geom)`;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const admin = await prisma.user.create({ data: { name: "Direction du Cadastre Minier", email: DEMO_ACCOUNTS.admin.email, role: "ADMIN", passwordHash } });
  const inspector = await prisma.user.create({ data: { name: "Nadège Mwamba (Inspecteur SIG)", email: DEMO_ACCOUNTS.inspector.email, role: "INSPECTOR", passwordHash } });
  const users = {} as Record<UKey, { id: string; name: string }>;
  for (const [k, c] of Object.entries(COMPANIES) as [UKey, (typeof COMPANIES)[UKey]][]) {
    const u = await prisma.user.create({ data: { name: c.person, email: c.email, role: "APPLICANT", company: c.name, rccm: c.rccm, passwordHash } });
    users[k] = { id: u.id, name: c.person };
  }
  const A = (u: { id: string; name: string }, role: "ADMIN" | "INSPECTOR" | "APPLICANT") => ({ id: u.id, name: u.name, role });

  const events: Ev[] = [];
  let n = 0;
  const setGeom = async (id: string, ring: number[][]) => {
    const gj = JSON.stringify({ type: "Polygon", coordinates: [ring] });
    await prisma.$executeRaw`UPDATE "Title" SET geom = ST_SetSRID(ST_GeomFromGeoJSON(${gj}::text), 4326),
      "areaHa" = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(${gj}::text), 4326)::geography) / 10000.0 WHERE id = ${id}`;
    return (await prisma.title.findUniqueOrThrow({ where: { id }, select: { areaHa: true } })).areaHa ?? 0;
  };

  async function makeDossier(opts: {
    titleId: string; code: string; ageDays: number; status: ApplicationStatus; user: UKey; label: string;
    decision?: string; opinion?: "FAVORABLE" | "UNFAVORABLE";
  }) {
    const ref = `DEM-2026-${String(10000 + ++n * 37)}`;
    const submitted = ago(opts.ageDays);
    const app = await prisma.application.create({
      data: {
        ref, applicantId: users[opts.user].id, titleId: opts.titleId, status: opts.status, submittedAt: submitted,
        ...(opts.status !== "SUBMITTED" ? { instructorId: inspector.id, instructorName: inspector.name } : {}),
        ...(["INSTRUCTED", "APPROVED", "REJECTED"].includes(opts.status) ? { opinion: opts.opinion ?? "FAVORABLE", opinionNote: "Levé topographique conforme, aucun chevauchement détecté au contrôle SIG." } : {}),
        ...(opts.status === "APPROVED" || opts.status === "REJECTED" ? { decidedById: admin.id, decidedByName: admin.name, decidedAt: ago(Math.max(opts.ageDays - 20, 1)), decisionNote: opts.decision } : {}),
      },
    });
    for (const [kind, label] of [["STATUTS", "Statuts"], ["RCCM", "RCCM"], ["EIE", "Etude d'impact environnemental"]] as const) {
      const data = tinyPdf(`${label} - ${COMPANIES[opts.user].name} - ${ref}`);
      await prisma.document.create({ data: { applicationId: app.id, kind, filename: `${label.replace(/[^A-Za-z]/g, "_")}.pdf`, mime: "application/pdf", size: data.length, sha256: createHash("sha256").update(data).digest("hex"), data } });
    }
    const push = (days: number, e: AuditEntry) => events.push({ at: ago(days), e: { ...e, entity: "Application", entityId: ref } });
    push(opts.ageDays, { action: "APPLICATION_SUBMITTED", details: `${opts.label} — ${opts.code}`, toStatus: "SUBMITTED", actor: A(users[opts.user], "APPLICANT") });
    if (opts.status !== "SUBMITTED") push(opts.ageDays - 3, { action: "APPLICATION_TAKEN", fromStatus: "SUBMITTED", toStatus: "IN_INSTRUCTION", details: "Dossier pris en charge pour instruction technique.", actor: A(inspector, "INSPECTOR") });
    if (["INSTRUCTED", "APPROVED", "REJECTED"].includes(opts.status)) push(opts.ageDays - 10, { action: "APPLICATION_INSTRUCTED", fromStatus: "IN_INSTRUCTION", toStatus: "INSTRUCTED", details: `Avis ${(opts.opinion ?? "FAVORABLE").toLowerCase()} : levé topographique conforme.`, actor: A(inspector, "INSPECTOR") });
    if (opts.status === "APPROVED") push(Math.max(opts.ageDays - 20, 1), { action: "APPLICATION_APPROVED", fromStatus: "INSTRUCTED", toStatus: "APPROVED", details: opts.decision ?? "Titre octroyé.", actor: A(admin, "ADMIN") });
    if (opts.status === "REJECTED") push(Math.max(opts.ageDays - 20, 1), { action: "APPLICATION_REJECTED", fromStatus: "INSTRUCTED", toStatus: "REJECTED", details: opts.decision ?? "Rejet motivé.", actor: A(admin, "ADMIN") });
  }

  for (const [key, blocks] of Object.entries(BLOCKS) as [ClusterKey, Blk[]][]) {
    const cl = CLUSTERS[key];
    for (const b of blocks) {
      const idx = ++n;
      const code =
        b.kind === "FREE" ? `LIB-${key}-${String(idx).padStart(3, "0")}`
        : b.kind === "RES" ? `ZR-${key}-${String(idx).padStart(3, "0")}`
        : b.kind === "PE" ? `PE-${13000 + idx * 17}`
        : b.kind === "PR" ? `PR-${24000 + idx * 23}`
        : `${b.pt === "EXPLOITATION" ? "PE" : "PR"}-2026-${String(900 + idx)}`;
      const type: PermitType | null = b.kind === "PE" ? "EXPLOITATION" : b.kind === "PR" ? "RESEARCH" : b.kind === "PEND" ? b.pt ?? "RESEARCH" : null;
      const status = b.kind === "FREE" ? "FREE" : b.kind === "RES" ? "RESERVED" : b.kind === "PEND" ? "PENDING" : "ATTRIBUTED";
      const granted = b.age ? ago(b.age) : null;
      const expiresAt = granted && type ? (b.exp !== undefined ? new Date(NOW + b.exp * DAY) : new Date(granted.getTime() + VALIDITY_YEARS[type] * 365 * DAY)) : null;
      const holderUser = b.user ? COMPANIES[b.user].name : undefined;

      const title = await prisma.title.create({
        data: {
          code, type, status, substances: b.subs ?? [], holderName: b.holder ?? holderUser ?? null, holderId: b.user && b.kind !== "PEND" ? users[b.user].id : b.user ? users[b.user].id : null,
          province: cl.province, locality: cl.name, grantedAt: granted, expiresAt,
        },
      });
      const areaHa = await setGeom(title.id, rectRing(cl, b.c, b.r, b.w, b.h));

      if (status === "ATTRIBUTED" && type && b.age) {
        const rate = FEE_RATE_USD_PER_HA[type];
        const amount = Math.round(areaHa * rate * 100) / 100;
        const cur = b.fee === "soon" ? new Date(NOW + 25 * DAY) : b.fee === "overdue" ? new Date(NOW - 35 * DAY) : new Date(NOW - 60 * DAY);
        const prior = Math.min(Math.floor(b.age / 365), 3);
        for (let k = prior; k >= 1; k--) {
          const due = new Date(cur); due.setFullYear(due.getFullYear() - k);
          await prisma.feePayment.create({ data: { titleId: title.id, year: due.getFullYear(), amountUsd: amount, dueDate: due, paidAt: new Date(due.getTime() - 9 * DAY), reference: `QT-${due.getFullYear()}-${idx}`, recordedBy: admin.name } });
        }
        const paid = b.fee === "paid";
        await prisma.feePayment.create({ data: { titleId: title.id, year: cur.getFullYear(), amountUsd: amount, dueDate: cur, paidAt: paid ? new Date(cur.getTime() - 10 * DAY) : null, reference: paid ? `QT-${cur.getFullYear()}-${idx}` : null, recordedBy: paid ? admin.name : null } });
        if (b.user) await makeDossier({ titleId: title.id, code, ageDays: Math.min(b.age, 900), status: "APPROVED", user: b.user, label: `Demande de ${type === "RESEARCH" ? "permis de recherche" : "permis d'exploitation"}`, decision: "Dossier complet et conforme. Titre octroyé." });
      }
      if (status === "PENDING" && b.user && b.app) {
        await makeDossier({ titleId: title.id, code, ageDays: b.app === "SUBMITTED" ? 2 : b.app === "IN_INSTRUCTION" ? 9 : 24, status: b.app, user: b.user, label: `Demande de ${type === "RESEARCH" ? "permis de recherche" : "permis d'exploitation"}` });
      }
    }
  }

  // Dossier rejeté (historique du demandeur de démonstration) : zone libre, titre non bloquant.
  const rej = await prisma.title.create({ data: { code: "PR-2026-REJ1", type: "RESEARCH", status: "REJECTED", substances: ["COBALT"], holderName: COMPANIES.demo.name, holderId: users.demo.id, province: "Lualaba", locality: "Kolwezi" } });
  await setGeom(rej.id, rectRing(CLUSTERS.KOL, 0, 7, 2, 2, 0));
  await makeDossier({ titleId: rej.id, code: rej.code, ageDays: 120, status: "REJECTED", user: "demo", label: "Demande de permis de recherche", opinion: "UNFAVORABLE", decision: "Rejet : étude d'impact environnemental incomplète (volet social manquant). Dossier à redéposer." });

  events.sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const ev of events) await prisma.$transaction((tx) => appendAudit(tx, { ...ev.e, createdAt: ev.at }));

  const [nt, na, nf] = await Promise.all([prisma.title.count(), prisma.application.count(), prisma.feePayment.count()]);
  console.log(`\n✔ ${nt} périmètres, ${na} dossiers, ${nf} redevances, ${events.length} entrées d'audit chaînées.`);
  console.log(`\nComptes de démonstration (mot de passe : ${DEMO_PASSWORD})`);
  for (const a of Object.values(DEMO_ACCOUNTS)) console.log(`  - ${a.label.padEnd(22)} ${a.email}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
