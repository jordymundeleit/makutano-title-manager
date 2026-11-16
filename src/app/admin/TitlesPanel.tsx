"use client";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/client";
import { PERMIT_LABEL, SUBSTANCE_LABEL, TITLE_STATUSES, TITLE_STATUS_LABEL, type Role, type TitleStatus } from "@/lib/constants";
import { fmtDate, fmtNum } from "@/lib/format";
import type { TitleCollection } from "@/lib/types";
import { TitleStatusBadge } from "@/components/Badges";
import { ErrorBox, Loading, SuccessBox } from "@/components/Feedback";

export default function TitlesPanel({ role }: { role: Role }) {
  const [data, setData] = useState<TitleCollection | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TitleStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await api<TitleCollection>("/api/titles?all=1")); } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function expire(id: string) {
    setError(null); setFlash(null);
    try { await api(`/api/titles/${id}/expire`, { method: "POST" }); setFlash("Expiration constatée : la zone ne bloque plus les nouvelles demandes."); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Action impossible."); }
  }

  const rows = data?.features.map((f) => f.properties).filter((p) => (!status || p.status === status) && (!q || `${p.code} ${p.holderName ?? ""} ${p.locality}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden /><input className="input pl-9" placeholder="Code, titulaire, localité…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Recherche" /></div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as TitleStatus | "")} aria-label="Filtrer par statut"><option value="">Tous les statuts</option>{TITLE_STATUSES.map((s) => <option key={s} value={s}>{TITLE_STATUS_LABEL[s]}</option>)}</select>
      </div>
      <ErrorBox message={error} /><SuccessBox message={flash} />
      {!data ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-line"><tr><th className="th">Code</th><th className="th">Titulaire</th><th className="th">Type</th><th className="th">Substances</th><th className="th text-right">Superficie</th><th className="th">Statut</th><th className="th">Échéance</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows?.map((p) => {
                const expired = p.status === "ATTRIBUTED" && p.expiresAt && new Date(p.expiresAt) < new Date();
                return (
                  <tr key={p.id}>
                    <td className="td font-mono text-xs">{p.code}<span className="block font-sans text-muted">{p.locality}</span></td>
                    <td className="td">{p.holderName ?? "—"}</td><td className="td">{p.type ? PERMIT_LABEL[p.type] : "—"}</td>
                    <td className="td text-muted">{p.substances.map((s) => SUBSTANCE_LABEL[s]).join(", ") || "—"}</td>
                    <td className="td num text-right">{p.areaHa ? `${fmtNum(p.areaHa)} ha` : "—"}</td>
                    <td className="td"><TitleStatusBadge status={p.status} /></td>
                    <td className={`td num text-xs ${expired ? "font-medium text-brand" : "text-muted"}`}>{p.expiresAt ? fmtDate(p.expiresAt) : "—"}{expired ? " · échu" : ""}</td>
                    <td className="td text-right">{role === "ADMIN" && expired && <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => expire(p.id)}>Constater l'expiration</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">{rows?.length} périmètre(s)</p>
        </div>
      )}
    </div>
  );
}
