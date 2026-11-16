"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, fmtUsd2 } from "@/lib/format";
import type { FeeRow } from "@/lib/types";
import { ErrorBox, Loading, SuccessBox } from "@/components/Feedback";

const STATE = { PAID: ["Payée", "text-gold"], OVERDUE: ["En retard", "text-brand"], DUE_SOON: ["Échéance proche", "text-orange-400"], UPCOMING: ["À venir", "text-muted"] } as const;
const FILTERS: [string, FeeRow["state"] | ""][] = [["Toutes", ""], ["En retard", "OVERDUE"], ["Échéance proche", "DUE_SOON"], ["À venir", "UPCOMING"], ["Payées", "PAID"]];

export default function FeesPanel() {
  const [fees, setFees] = useState<FeeRow[] | null>(null);
  const [filter, setFilter] = useState<FeeRow["state"] | "">("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setFees((await api<{ fees: FeeRow[] }>("/api/fees")).fees); } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function pay(id: string) {
    setBusy(true); setError(null); setFlash(null);
    try { await api(`/api/fees/${id}/pay`, { method: "POST", json: { reference: ref } }); setFlash("Paiement enregistré et tracé dans le journal d'audit."); setPayId(null); setRef(""); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }

  const shown = fees?.filter((f) => !filter || f.state === filter);
  const total = shown?.reduce((a, f) => a + f.amountUsd, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Redevances superficielles annuelles</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer">
          {FILTERS.map(([l, v]) => <button key={l} onClick={() => setFilter(v)} aria-pressed={filter === v} className={`rounded-full border px-3 py-1 text-xs ${filter === v ? "border-mining bg-mining/15 text-mining" : "border-line text-muted hover:text-white"}`}>{l}</button>)}
        </div>
      </div>
      <ErrorBox message={error} /><SuccessBox message={flash} />
      {!fees ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line"><tr><th className="th">Titre</th><th className="th">Titulaire</th><th className="th">Année</th><th className="th text-right">Montant</th><th className="th">Échéance</th><th className="th">État</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-line">
              {shown?.map((f) => (
                <tr key={f.id}>
                  <td className="td font-mono text-xs">{f.title.code}</td><td className="td">{f.title.holderName ?? "—"}</td><td className="td num">{f.year}</td>
                  <td className="td num text-right">{fmtUsd2(f.amountUsd)}</td><td className="td num text-xs">{fmtDate(f.dueDate)}</td>
                  <td className={`td text-xs font-medium ${STATE[f.state][1]}`}>{STATE[f.state][0]}{f.reference ? <span className="block font-normal text-muted">réf. {f.reference}</span> : null}</td>
                  <td className="td text-right">
                    {f.state === "PAID" ? null : payId === f.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input className="input w-36 py-1.5 text-xs" placeholder="Référence bancaire" value={ref} onChange={(e) => setRef(e.target.value)} aria-label="Référence du paiement" autoFocus />
                        <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy} onClick={() => pay(f.id)}>{busy && <Loader2 size={12} className="animate-spin" />} OK</button>
                        <button className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setPayId(null)}>Annuler</button>
                      </div>
                    ) : <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { setPayId(f.id); setRef(""); }}>Enregistrer le paiement</button>}
                  </td>
                </tr>
              ))}
              {shown?.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">Aucune redevance dans cette catégorie.</td></tr>}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">{shown?.length} ligne(s) · total {fmtUsd2(total)} (barème indicatif de démonstration)</p>
        </div>
      )}
    </div>
  );
}
