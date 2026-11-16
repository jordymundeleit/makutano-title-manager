// Constantes partagées serveur / client (aucun import).
export const ROLES = ["ADMIN", "INSPECTOR", "APPLICANT"] as const;
export type Role = (typeof ROLES)[number];
export const SUBSTANCES = ["COBALT", "COPPER", "COLTAN", "GOLD"] as const;
export type Substance = (typeof SUBSTANCES)[number];
export const PERMIT_TYPES = ["RESEARCH", "EXPLOITATION"] as const;
export type PermitType = (typeof PERMIT_TYPES)[number];
export const TITLE_STATUSES = ["FREE", "ATTRIBUTED", "PENDING", "RESERVED", "REJECTED", "EXPIRED"] as const;
export type TitleStatus = (typeof TITLE_STATUSES)[number];
export const APP_STATUSES = ["SUBMITTED", "IN_INSTRUCTION", "INSTRUCTED", "APPROVED", "REJECTED"] as const;
export type AppStatus = (typeof APP_STATUSES)[number];
export const DOC_KINDS = ["STATUTS", "RCCM", "EIE", "AUTRE"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin Ministère", INSPECTOR: "Inspecteur SIG", APPLICANT: "Demandeur" };
export const SUBSTANCE_LABEL: Record<Substance, string> = { COBALT: "Cobalt", COPPER: "Cuivre", COLTAN: "Coltan", GOLD: "Or" };
export const PERMIT_LABEL: Record<PermitType, string> = { RESEARCH: "Permis de recherche", EXPLOITATION: "Permis d'exploitation" };
export const TITLE_STATUS_LABEL: Record<TitleStatus, string> = {
  FREE: "Libre", ATTRIBUTED: "Occupé / attribué", PENDING: "En cours d'instruction",
  RESERVED: "Zone réservée", REJECTED: "Rejeté", EXPIRED: "Expiré",
};
export const APP_STATUS_LABEL: Record<AppStatus, string> = {
  SUBMITTED: "Déposée", IN_INSTRUCTION: "En instruction", INSTRUCTED: "Instruite", APPROVED: "Titre octroyé", REJECTED: "Rejetée",
};
export const DOC_LABEL: Record<DocKind, string> = {
  STATUTS: "Statuts de l'entreprise", RCCM: "RCCM", EIE: "Étude d'impact environnemental", AUTRE: "Autre pièce",
};

export const STATUS_COLOR: Record<TitleStatus, { fill: string; stroke: string }> = {
  FREE: { fill: "#22C55E", stroke: "#16A34A" },
  ATTRIBUTED: { fill: "#E53935", stroke: "#B71C1C" },
  PENDING: { fill: "#FB8C00", stroke: "#E65100" },
  RESERVED: { fill: "#9E9E9E", stroke: "#F59E0B" },
  REJECTED: { fill: "#555555", stroke: "#777777" },
  EXPIRED: { fill: "#555555", stroke: "#777777" },
};

export const MAP_STATUSES = ["FREE", "ATTRIBUTED", "PENDING", "RESERVED"] as const;
export const BLOCKING_STATUSES = ["ATTRIBUTED", "PENDING", "RESERVED"] as const;
export const PROVINCES = ["Lualaba", "Haut-Katanga", "Nord-Kivu", "Sud-Kivu"] as const;

// Paramètres INDICATIFS de démonstration (à aligner sur le Code minier et le barème officiel).
export const VALIDITY_YEARS: Record<PermitType, number> = { RESEARCH: 5, EXPLOITATION: 30 };
export const FEE_RATE_USD_PER_HA: Record<PermitType, number> = { RESEARCH: 0.4, EXPLOITATION: 1.2 };
export const FEE_SOON_DAYS = 60;
export const EXPIRY_SOON_DAYS = 180;
export const EXPIRY_CRITICAL_DAYS = 90;

export const DRC_BOUNDS = { minLat: -13.6, maxLat: 5.5, minLng: 12.0, maxLng: 31.5 };
export const AREA_LIMITS_HA = { min: 5, max: 40000 };
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 4 * 1000 * 1000; // limite de corps de requête Vercel ≈ 4,5 Mo

export const DEMO_PASSWORD = "Makutano#2026";
export const DEMO_ACCOUNTS = {
  admin: { email: "admin@cadastre.demo", label: "Admin Ministère", hint: "Décisions, redevances, audit" },
  inspector: { email: "inspecteur@cadastre.demo", label: "Inspecteur SIG", hint: "Instruction technique des dossiers" },
  applicant: { email: "demandeur@cadastre.demo", label: "Demandeur (société)", hint: "Déposer une demande, suivre ses dossiers" },
} as const;
