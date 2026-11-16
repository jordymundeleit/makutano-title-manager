"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, FileText, Loader2, ShieldAlert, ShieldCheck, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import { api } from "@/lib/client";
import { DOC_LABEL, PERMIT_LABEL, ROLE_LABEL, SUBSTANCE_LABEL, type Role } from "@/lib/constants";
import { fmtDate, fmtDateTime, fmtNum } from "@/lib/format";
import type { ApplicationDetailData, TitleCollection } from "@/lib/types";
import { AppStatusBadge, AppStepper } from "./Badges";
import { ErrorBox, Loading, SuccessBox } from "./Feedback";

const GeoMap = dynamic(() => import("./GeoMap"), { ssr: false, loading: () => <Loading label="Carte…" /> });

const ACTION_LABEL: Record<string, string> = {
  APPLICATION_SUBMITTED: "Dossier déposé", APPLICATION_TAKEN: "Pris en charge", APPLICATION_INSTRUCTED: "Instruction terminée",
  APPLICATION_APPROVED: "Titre octroyé", APPLICATION_REJECTED: "Dossier rejeté",
};
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export default function ApplicationDetail({ id, role, onChanged }: { id: string; role: Role; onChanged?: () => void }) {
  const [d, setD] = useState<ApplicationDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [opinion, setOpinion] = useState<"FAVORABLE" | "UNFAVORABLE" | "">("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setD(await api<ApplicationDetailData>(`/api/applications/${id}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const collection = useMemo<TitleCollection | null>(() => {
    if (!d?.geometry) return null;
    const t = d.application.title;
    return { type: "FeatureCollection", counts: {}, authenticated: true, features: [{
      type: "Feature", id: t.id, geometry: d.geometry,
      properties: { id: t.id, code: t.code, status: t.status, type: t.type, substances: t.substances, areaHa: t.areaHa, province: t.province, locality: t.locality },
    }] };
  }, [d]);
  const conflictGeoms = useMemo(() => d?.conflicts.map((c) => c.geometry) ?? [], [d]);

  async function act(action: "TAKE" | "INSTRUCT" | "APPROVE" | "REJECT") {
    setError(null); setFlash(null); setBusy(action);
    try {
      await api(`/api/applications/${id}/action`, { method: "POST", json: { action, note, opinion: opinion || undefined } });
      setFlash({ TAKE: "Dossier pris en charge.", INSTRUCT: "Avis technique transmis à l'administration.", APPROVE: "Titre octroyé : la zone passe en « Occupé / attribué » et la première redevance est programmée.", REJECT: "Dossier rejeté : la zone est libérée." }[action]);
      setNote(""); setOpinion("");
      await load(); onChanged?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Action impossible."); }
    finally { setBusy(null); }
  }

  if (!d) return error ? <ErrorBox message={error} /> : <Loading label="Chargement du dossier…" />;
  const a = d.application, t = a.title;
  const open = ["SUBMITTED", "IN_INSTRUCTION", "INSTRUCTED"].includes(a.status);
  const staff = role !== "APPLICANT";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3"><AppStatusBadge status={a.status} /><span className="text-xs text-muted">Déposée le {fmtDateTime(a.submittedAt)}</span></div>
          <AppStepper status={a.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {[
            ["Périmètre", t.code], ["Type", t.type ? PERMIT_LABEL[t.type] : "—"], ["Superficie", t.areaHa ? `${fmtNum(t.areaHa, 2)} ha` : "—"],
            ["Substances", t.substances.map((s) => SUBSTANCE_LABEL[s]).join(", ") || "—"], ["Localisation", `${t.locality}, ${t.province}`],
            ["Demandeur", a.applicant.company ?? a.applicant.name], ["RCCM", a.applicant.rccm ?? "—"], ["Instructeur", a.instructorName ?? "Non assigné"],
            ...(t.expiresAt ? [["Échéance", fmtDate(t.expiresAt)]] : []),
          ].map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
        </dl>

        {staff && open && (
          d.conflicts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-line px-3 py-2.5 text-sm text-muted"><ShieldCheck size={16} className="text-gold" aria-hidden /> Contrôle SIG en direct : aucun chevauchement avec un titre existant.</div>
          ) : (
            <ErrorBox message={`Chevauchement détecté avec ${d.conflicts.map((c) => `${c.code} (${c.overlapHa} ha)`).join(", ")}. L'octroi est bloqué.`} />
          )
        )}

        {a.opinion && (
          <div className="rounded-md border border-line p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">{a.opinion === "FAVORABLE" ? <ThumbsUp size={16} className="text-gold" /> : <ThumbsDown size={16} className="text-brand" />} Avis technique {a.opinion === "FAVORABLE" ? "favorable" : "défavorable"}</p>
            {a.opinionNote && <p className="mt-1 text-muted">{a.opinionNote}</p>}
          </div>
        )}
        {a.decisionNote && (
          <div className={`rounded-md border p-3 text-sm ${a.status === "REJECTED" ? "border-brand/60 bg-brand/10" : "border-gold/50 bg-gold/10"}`}>
            <p className="flex items-center gap-2 font-medium">{a.status === "REJECTED" ? <XCircle size={16} className="text-brand" /> : <BadgeCheck size={16} className="text-gold" />} Décision{a.decidedByName ? ` — ${a.decidedByName}` : ""}{a.decidedAt ? `, ${fmtDate(a.decidedAt)}` : ""}</p>
            <p className="mt-1 text-white/90">{a.decisionNote}</p>
          </div>
        )}

        <div>
          <h3 className="mb-2 font-display text-lg font-semibold">Pièces justificatives</h3>
          <ul className="divide-y divide-line rounded-md border border-line">
            {d.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2"><FileText size={16} className="shrink-0 text-mining" aria-hidden /><span className="truncate"><span className="font-medium">{DOC_LABEL[doc.kind]}</span> <span className="text-muted">· {doc.filename} · {kb(doc.size)}</span></span></span>
                <a className="shrink-0 text-mining hover:underline" href={`/api/applications/${id}/documents/${doc.id}`} target="_blank" rel="noopener noreferrer">Ouvrir</a>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted">Empreinte SHA-256 enregistrée pour chaque pièce.</p>
        </div>

        <div>
          <h3 className="mb-3 font-display text-lg font-semibold">Historique tracé</h3>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {d.history.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full bg-mining ring-4 ring-panel" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3"><p className="text-sm font-semibold">{ACTION_LABEL[h.action] ?? h.action}</p><time className="num text-xs text-muted">{fmtDateTime(h.createdAt)}</time></div>
                <p className="text-xs text-muted">{h.actorName}{h.actorRole ? ` · ${ROLE_LABEL[h.actorRole]}` : ""}</p>
                {h.details && <p className="mt-1 text-sm text-white/90">{h.details}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="h-72 overflow-hidden rounded-lg border border-line">
          {collection ? <GeoMap data={collection} focus={d.geometry} conflicts={conflictGeoms} selectedId={t.id} /> : <p className="p-4 text-sm text-muted">Géométrie indisponible.</p>}
        </div>

        {role === "INSPECTOR" && a.status === "SUBMITTED" && (
          <button className="btn-primary w-full" disabled={busy !== null} onClick={() => act("TAKE")}>{busy === "TAKE" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Prendre en charge ce dossier</button>
        )}

        {role === "INSPECTOR" && a.status === "IN_INSTRUCTION" && (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-sm font-medium">Avis technique</p>
            <div className="grid grid-cols-2 gap-2">
              {(["FAVORABLE", "UNFAVORABLE"] as const).map((o) => (
                <button key={o} type="button" onClick={() => setOpinion(o)} aria-pressed={opinion === o}
                  className={`btn-ghost ${opinion === o ? (o === "FAVORABLE" ? "!border-gold !text-gold" : "!border-brand !text-brand") : ""}`}>
                  {o === "FAVORABLE" ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />} {o === "FAVORABLE" ? "Favorable" : "Défavorable"}
                </button>
              ))}
            </div>
            <textarea className="input" rows={3} maxLength={1000} placeholder="Motivation technique (levé, conformité, pièces…)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Motivation de l'avis" />
            <ErrorBox message={error} /><SuccessBox message={flash} />
            <button className="btn-primary w-full" disabled={busy !== null} onClick={() => act("INSTRUCT")}>{busy === "INSTRUCT" && <Loader2 size={16} className="animate-spin" />} Transmettre l'avis</button>
          </div>
        )}

        {role === "ADMIN" && open && (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-sm font-medium">Décision du Ministère</p>
            <textarea className="input" rows={3} maxLength={1000} placeholder="Commentaire (obligatoire pour un rejet)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Motif de la décision" />
            <ErrorBox message={error} /><SuccessBox message={flash} />
            <button className="btn-primary w-full" disabled={busy !== null || d.conflicts.length > 0} onClick={() => act("APPROVE")}>{busy === "APPROVE" ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />} Octroyer le titre</button>
            <button className="btn-danger w-full" disabled={busy !== null} onClick={() => act("REJECT")}>{busy === "REJECT" ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />} Rejeter (motivé)</button>
          </div>
        )}

        {!(role === "INSPECTOR" && a.status === "IN_INSTRUCTION") && !(role === "ADMIN" && open) && (<><ErrorBox message={error} /><SuccessBox message={flash} /></>)}
      </aside>
    </div>
  );
}
