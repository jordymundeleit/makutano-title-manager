"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { api } from "@/lib/client";
import { PERMIT_LABEL, SUBSTANCE_LABEL } from "@/lib/constants";
import { fmtDate, fmtDateTime, fmtNum, fmtUsd2 } from "@/lib/format";
import type { AlertView, ApplicationRow, FeeRow } from "@/lib/types";
import { AppStatusBadge } from "@/components/Badges";
import ApplicationDetail from "@/components/ApplicationDetail";
import { ErrorBox, Loading } from "@/components/Feedback";

const FEE_STATE = { PAID: ["Payée", "text-gold"], OVERDUE: ["En retard", "text-brand"], DUE_SOON: ["Échéance proche", "text-orange-400"], UPCOMING: ["À venir", "text-muted"] } as const;

export default function ApplicantDashboard({ company }: { company: string }) {
  const [apps, setApps] = useState<ApplicationRow[] | null>(null);
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, al, f] = await Promise.all([api<{ applications: ApplicationRow[] }>("/api/applications"), api<{ alerts: AlertView[] }>("/api/alerts"), api<{ fees: FeeRow[] }>("/api/fees")]);
      setApps(a.applications); setAlerts(al.alerts); setFees(f.fees); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-3xl font-bold">Mes dossiers</h1><p className="text-sm text-muted">{company}</p></div>
        <Link href="/applicant/new" className="btn-primary"><Plus size={16} /> Nouvelle demande de titre</Link>
      </div>
      <ErrorBox message={error} />

      {alerts.length > 0 && (
        <section className="space-y-2" aria-label="Alertes">
          {alerts.map((a) => (
            <div key={a.id} className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${a.severity === "critical" ? "border-brand/60 bg-brand/10" : "border-gold/50 bg-gold/10"}`}>
              <AlertTriangle size={18} className={`mt-0.5 shrink-0 ${a.severity === "critical" ? "text-brand" : "text-gold"}`} aria-hidden />
              <p><span className="font-mono">{a.titleCode}</span> — {a.message}</p>
            </div>
          ))}
        </section>
      )}

      {!apps ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-line"><tr><th className="th">Référence</th><th className="th">Périmètre</th><th className="th">Type</th><th className="th text-right">Superficie</th><th className="th">Statut</th><th className="th">Déposée le</th></tr></thead>
            <tbody className="divide-y divide-line">
              {apps.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-white/5" onClick={() => setOpen(a.id)}>
                  <td className="td font-mono text-xs">{a.ref}</td>
                  <td className="td">{a.title.code}<span className="block text-xs text-muted">{a.title.locality} · {a.title.substances.map((s) => SUBSTANCE_LABEL[s]).join(", ")}</span></td>
                  <td className="td">{a.title.type ? PERMIT_LABEL[a.title.type] : "—"}</td>
                  <td className="td num text-right">{a.title.areaHa ? `${fmtNum(a.title.areaHa)} ha` : "—"}</td>
                  <td className="td"><AppStatusBadge status={a.status} /></td>
                  <td className="td num text-xs text-muted">{fmtDateTime(a.submittedAt)}</td>
                </tr>
              ))}
              {apps.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">Aucun dossier pour l'instant. Déposez votre première demande.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {fees.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Mes redevances superficielles</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-line"><tr><th className="th">Titre</th><th className="th">Année</th><th className="th text-right">Montant</th><th className="th">Échéance</th><th className="th">État</th></tr></thead>
              <tbody className="divide-y divide-line">
                {fees.map((f) => (
                  <tr key={f.id}>
                    <td className="td font-mono text-xs">{f.title.code}</td><td className="td num">{f.year}</td>
                    <td className="td num text-right">{fmtUsd2(f.amountUsd)}</td><td className="td num text-xs">{fmtDate(f.dueDate)}</td>
                    <td className={`td text-xs font-medium ${FEE_STATE[f.state][1]}`}>{FEE_STATE[f.state][0]}{f.paidAt ? ` · ${fmtDate(f.paidAt)}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Détail du dossier">
          <div className="card w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line p-5">
              <h2 className="font-display text-2xl font-bold">Suivi du dossier</h2>
              <button className="btn-ghost px-2.5" onClick={() => setOpen(null)} aria-label="Fermer"><X size={18} /></button>
            </div>
            <div className="p-5"><ApplicationDetail id={open} role="APPLICANT" /></div>
          </div>
        </div>
      )}
    </main>
  );
}
