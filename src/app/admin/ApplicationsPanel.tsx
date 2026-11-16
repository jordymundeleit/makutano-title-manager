"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { api } from "@/lib/client";
import { APP_STATUSES, APP_STATUS_LABEL, PERMIT_LABEL, SUBSTANCE_LABEL, type AppStatus, type Role } from "@/lib/constants";
import { fmtDateTime, fmtNum } from "@/lib/format";
import type { ApplicationRow } from "@/lib/types";
import { AppStatusBadge } from "@/components/Badges";
import ApplicationDetail from "@/components/ApplicationDetail";
import { ErrorBox, Loading } from "@/components/Feedback";

export default function ApplicationsPanel({ role }: { role: Role }) {
  const [rows, setRows] = useState<ApplicationRow[] | null>(null);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AppStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setQ(input.trim()), 300); return () => clearTimeout(t); }, [input]);
  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams(); if (q) p.set("q", q); if (status) p.set("status", status);
      setRows((await api<{ applications: ApplicationRow[] }>(`/api/applications?${p}`)).applications); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }, [q, status]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden /><input className="input pl-9" placeholder="Référence, code du titre, société…" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Recherche" /></div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as AppStatus | "")} aria-label="Filtrer par statut"><option value="">Tous les statuts</option>{APP_STATUSES.map((s) => <option key={s} value={s}>{APP_STATUS_LABEL[s]}</option>)}</select>
        <button className="btn-ghost" onClick={load}><RefreshCw size={16} /> Actualiser</button>
      </div>
      <ErrorBox message={error} />
      {!rows && !error && <Loading />}
      {rows && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-line"><tr><th className="th">Référence</th><th className="th">Demandeur</th><th className="th">Périmètre</th><th className="th">Type</th><th className="th text-right">Superficie</th><th className="th">Statut</th><th className="th">Déposée le</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-white/5" onClick={() => setOpen(a.id)}>
                  <td className="td font-mono text-xs">{a.ref}</td>
                  <td className="td">{a.applicant.company ?? a.applicant.name}</td>
                  <td className="td">{a.title.code}<span className="block text-xs text-muted">{a.title.locality} · {a.title.substances.map((s) => SUBSTANCE_LABEL[s]).join(", ")}</span></td>
                  <td className="td">{a.title.type ? PERMIT_LABEL[a.title.type] : "—"}</td>
                  <td className="td num text-right">{a.title.areaHa ? `${fmtNum(a.title.areaHa)} ha` : "—"}</td>
                  <td className="td"><AppStatusBadge status={a.status} /></td>
                  <td className="td num text-xs text-muted">{fmtDateTime(a.submittedAt)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">Aucune demande ne correspond.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8" onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label="Dossier">
          <div className="card w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line p-5"><h2 className="font-display text-2xl font-bold">Instruction du dossier</h2><button className="btn-ghost px-2.5" onClick={() => setOpen(null)} aria-label="Fermer"><X size={18} /></button></div>
            <div className="p-5"><ApplicationDetail id={open} role={role} onChanged={load} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
