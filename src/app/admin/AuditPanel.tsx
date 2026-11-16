"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { ErrorBox, Loading } from "@/components/Feedback";

type Log = { id: string; seq: number; action: string; entity: string | null; entityId: string | null; details: string | null; fromStatus: string | null; toStatus: string | null; actorName: string; actorRole: Role | null; ip: string | null; createdAt: string; hash: string };
type Resp = { logs: Log[]; chain: { valid: boolean; brokenSeq: number | null; total: number } };

const LABEL: Record<string, string> = {
  LOGIN: "Connexion", LOGIN_FAILED: "Connexion échouée", LOGOUT: "Déconnexion", ACCOUNT_CREATED: "Compte créé",
  APPLICATION_SUBMITTED: "Dossier déposé", APPLICATION_TAKEN: "Dossier pris en charge", APPLICATION_INSTRUCTED: "Dossier instruit",
  APPLICATION_APPROVED: "Titre octroyé", APPLICATION_REJECTED: "Dossier rejeté", FEE_PAID: "Redevance payée", TITLE_EXPIRED: "Expiration constatée",
};

export default function AuditPanel() {
  const [d, setD] = useState<Resp | null>(null);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setQ(input.trim()), 300); return () => clearTimeout(t); }, [input]);
  const load = useCallback(async () => {
    try { setD(await api<Resp>(`/api/audit${q ? `?q=${encodeURIComponent(q)}` : ""}`)); setError(null); } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }, [q]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Journal d'audit infalsifiable</h2>
        <div className="relative w-full sm:w-80"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden /><input className="input pl-9" placeholder="Agent, action, code de dossier…" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Recherche" /></div>
      </div>
      <ErrorBox message={error} />
      {!d && !error && <Loading />}
      {d && (
        <>
          <div className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${d.chain.valid ? "border-line text-muted" : "border-brand bg-brand/10 text-white"}`}>
            {d.chain.valid ? <><ShieldCheck size={16} className="text-gold" aria-hidden /> Chaîne intègre : {d.chain.total} entrées vérifiées (SHA-256), aucune altération détectée.</> : <><ShieldAlert size={16} className="text-brand" aria-hidden /> Chaîne rompue à l'entrée n°{d.chain.brokenSeq} : le journal a été modifié.</>}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-line"><tr><th className="th">N°</th><th className="th">Quand</th><th className="th">Agent</th><th className="th">Action</th><th className="th">Détail</th><th className="th">Empreinte</th></tr></thead>
              <tbody className="divide-y divide-line">
                {d.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="td num text-xs text-muted">{l.seq}</td>
                    <td className="td num whitespace-nowrap text-xs text-muted">{fmtDateTime(l.createdAt)}</td>
                    <td className="td">{l.actorName}{l.actorRole && <span className="block text-xs text-mining">{ROLE_LABEL[l.actorRole]}</span>}</td>
                    <td className={`td whitespace-nowrap font-medium ${l.action === "LOGIN_FAILED" || l.action === "APPLICATION_REJECTED" ? "text-brand" : ""}`}>{LABEL[l.action] ?? l.action}{l.fromStatus && l.toStatus ? <span className="block text-xs font-normal text-muted">{l.fromStatus} → {l.toStatus}</span> : null}</td>
                    <td className="td max-w-sm text-muted">{l.entityId && <span className="mr-1 font-mono text-xs text-white">{l.entityId}</span>}{l.details}</td>
                    <td className="td num font-mono text-[11px] text-muted/70" title={l.hash}>{l.hash.slice(0, 12)}…</td>
                  </tr>
                ))}
                {d.logs.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">Aucune entrée ne correspond.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
