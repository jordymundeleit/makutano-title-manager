import type { Feature, Geometry } from "geojson";
import type { AppStatus, DocKind, PermitType, Role, Substance, TitleStatus } from "./constants";

export type TitleProps = {
  id: string; code: string; status: TitleStatus; type: PermitType | null; substances: Substance[];
  areaHa: number | null; province: string; locality: string;
  holderName?: string | null; grantedAt?: string | null; expiresAt?: string | null;
};
export type TitleFeature = Feature<Geometry, TitleProps>;
export type TitleCollection = { type: "FeatureCollection"; features: TitleFeature[]; counts: Record<string, number>; authenticated: boolean };

export type ConflictView = {
  titleId: string; code: string; status: TitleStatus; type: PermitType | null; holderName: string | null; overlapHa: number; geometry: Geometry;
};
export type CheckResult = { ok: boolean; error?: string; areaHa?: number; conflicts: ConflictView[] };

export type ApplicationRow = {
  id: string; ref: string; status: AppStatus; submittedAt: string; opinion: "FAVORABLE" | "UNFAVORABLE" | null;
  applicant: { name: string; company: string | null };
  title: { id: string; code: string; type: PermitType | null; substances: Substance[]; areaHa: number | null; province: string; locality: string; status: TitleStatus };
};

export type HistoryItem = {
  id: string; action: string; fromStatus: string | null; toStatus: string | null; details: string | null;
  actorName: string; actorRole: Role | null; createdAt: string;
};
export type ApplicationDetailData = {
  application: {
    id: string; ref: string; status: AppStatus; submittedAt: string; opinion: "FAVORABLE" | "UNFAVORABLE" | null; opinionNote: string | null;
    decisionNote: string | null; decidedByName: string | null; decidedAt: string | null; instructorName: string | null;
    applicant: { name: string; company: string | null; rccm: string | null; email: string };
    title: { id: string; code: string; type: PermitType | null; substances: Substance[]; areaHa: number | null; province: string; locality: string; status: TitleStatus; expiresAt: string | null };
  };
  geometry: Geometry | null;
  conflicts: ConflictView[];
  documents: { id: string; kind: DocKind; filename: string; size: number; sha256: string }[];
  history: HistoryItem[];
};

export type AlertView = {
  id: string; kind: "FEE_OVERDUE" | "FEE_DUE_SOON" | "TITLE_EXPIRING" | "TITLE_EXPIRED"; severity: "critical" | "warning";
  titleId: string; titleCode: string; holderName: string | null; message: string; date: string; daysLeft: number; feeId?: string; amountUsd?: number;
};
export type FeeRow = {
  id: string; year: number; amountUsd: number; dueDate: string; paidAt: string | null; reference: string | null;
  state: "PAID" | "OVERDUE" | "DUE_SOON" | "UPCOMING"; title: { id: string; code: string; holderName: string | null };
};
