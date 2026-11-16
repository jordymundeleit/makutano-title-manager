"use client";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/client";
import { MAP_STATUSES, STATUS_COLOR, TITLE_STATUS_LABEL, type Role } from "@/lib/constants";
import { fmtDate, fmtInt, fmtUsd } from "@/lib/format";
import type { AlertView } from "@/lib/types";
import { ErrorBox, Loading } from "@/components/Feedback";

type Dash = {
  kpis: { attributed: number; attributedAreaHa: number; freeAreaHa: number; pending: number; toTake: number; toDecide: number; feesCollected: number; feesOutstanding: number; feesOverdue: number };
  byProvince: Record<string, number | string>[];
  alerts: AlertView[];
};

export default function Overview({ role, goto }: { role: Role; goto: (tab: string) => void }) {
  const [d, setD] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setD(await api<Dash>("/api/dashboard")); setError(null); } catch (e) { setError(e instanceof Error ? e.message : "Chargement impossible."); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (!d) return error ? <ErrorBox message={error} /> : <Loading label="Chargement du tableau de bord…" />;
  const k = d.kpis;
  const cards = [
    { label: "Titres attribués", value: fmtInt(k.attributed), sub: `${fmtInt(k.attributedAreaHa)} ha sous titre`, color: "text-brand" },
    { label: "Demandes en cours", value: fmtInt(k.pending), sub: role === "ADMIN" ? `${k.toDecide} à décider` : `${k.toTake} à prendre en charge`, color: "text-orange-400" },
    { label: "Zones libres", value: `${fmtInt(k.freeAreaHa)} ha`, sub: "disponibles au dépôt", color: "text-mining" },
    ...(role === "ADMIN" ? [{ label: "Redevances encaissées", value: fmtUsd(k.feesCollected), sub: `${fmtUsd(k.feesOutstanding)} à recouvrer · ${fmtUsd(k.feesOverdue)} en retard`, color: "text-gold" }] : []),
  ];
  const critical = d.alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="space-y-6">
      <ErrorBox message={error} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <p className="text-sm text-muted">{c.label}</p>
            <p className={`num mt-2 font-display text-4xl font-bold ${c.color}`}>{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">Alertes redevances et échéances</h2>
            {critical > 0 && <span className="rounded-full border border-brand px-2.5 py-0.5 text-xs text-brand">{critical} critique{critical > 1 ? "s" : ""}</span>}
          </div>
          <ul className="mt-3 max-h-[380px] divide-y divide-line overflow-y-auto">
            {d.alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3 text-sm">
                <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${a.severity === "critical" ? "text-brand" : "text-gold"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p><span className="font-mono">{a.titleCode}</span> <span className="text-muted">· {a.holderName ?? "—"}</span></p>
                  <p className="text-white/90">{a.message}</p>
                </div>
                <time className="num shrink-0 text-xs text-muted">{fmtDate(a.date)}</time>
              </li>
            ))}
            {d.alerts.length === 0 && <li className="py-6 text-center text-sm text-muted">Aucune alerte : tous les titres sont à jour.</li>}
          </ul>
          {role === "ADMIN" && d.alerts.length > 0 && <button onClick={() => goto("fees")} className="mt-3 text-sm text-mining hover:underline">Gérer les redevances</button>}
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl font-semibold">Superficie par province et par statut (ha)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.byProvince}>
                <CartesianGrid stroke="#2E2E2E" vertical={false} />
                <XAxis dataKey="province" stroke="#A3A3A3" fontSize={12} tickLine={false} />
                <YAxis stroke="#A3A3A3" fontSize={12} tickLine={false} width={48} />
                <Tooltip contentStyle={{ background: "#1E1E1E", border: "1px solid #2E2E2E", borderRadius: 8, color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {MAP_STATUSES.map((s) => <Bar key={s} dataKey={s} name={TITLE_STATUS_LABEL[s]} stackId="a" fill={STATUS_COLOR[s].fill} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
