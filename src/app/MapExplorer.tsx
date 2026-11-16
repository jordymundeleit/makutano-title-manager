"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { api } from "@/lib/client";
import { MAP_STATUSES, PERMIT_LABEL, PERMIT_TYPES, PROVINCES, STATUS_COLOR, SUBSTANCES, SUBSTANCE_LABEL, TITLE_STATUS_LABEL, type PermitType, type Role, type Substance, type TitleStatus } from "@/lib/constants";
import { CLUSTERS } from "@/lib/demo-geo";
import { fmtDate, fmtNum } from "@/lib/format";
import type { TitleCollection, TitleFeature } from "@/lib/types";
import type { FlyTarget } from "@/components/GeoMap";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBox } from "@/components/Feedback";
import { TitleStatusBadge } from "@/components/Badges";

const GeoMap = dynamic(() => import("@/components/GeoMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted"><Loader2 className="mr-2 animate-spin" size={16} /> Chargement de la carte…</div>,
});

const ZONES = [
  { label: "Lualaba", lat: -10.75, lng: 25.8, zoom: 9 },
  { label: "Haut-Katanga", lat: -11.7, lng: 27.4, zoom: 9 },
  { label: "Nord-Kivu", lat: -1.4, lng: 28.1, zoom: 10 },
  { label: "Sud-Kivu", lat: -3.05, lng: 28.35, zoom: 10 },
];

function center(f: TitleFeature): { lat: number; lng: number } {
  const ring = (f.geometry as GeoJSON.Polygon).coordinates[0];
  return { lng: ring.reduce((a, p) => a + p[0], 0) / ring.length, lat: ring.reduce((a, p) => a + p[1], 0) / ring.length };
}

export default function MapExplorer({ user }: { user: { name: string; role: Role } | null }) {
  const [type, setType] = useState<PermitType | "">("");
  const [substance, setSubstance] = useState<Substance | "">("");
  const [visible, setVisible] = useState<Set<TitleStatus>>(new Set(MAP_STATUSES));
  const [data, setData] = useState<TitleCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fly, setFly] = useState<FlyTarget | null>(null);
  const [search, setSearch] = useState("");
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    if (substance) p.set("substance", substance);
    api<TitleCollection>(`/api/titles?${p}`)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Chargement impossible."));
    return () => { cancelled = true; };
  }, [type, substance]);

  const shown = useMemo<TitleCollection | null>(() => (data ? { ...data, features: data.features.filter((f) => visible.has(f.properties.status)) } : null), [data, visible]);
  const selected = data?.features.find((f) => f.properties.id === selectedId) ?? null;

  const toggle = (s: TitleStatus) => setVisible((v) => { const n = new Set(v); if (n.has(s)) n.delete(s); else n.add(s); return n; });

  function find(e: React.FormEvent) {
    e.preventDefault();
    setSearchMsg(null);
    const q = search.trim().toUpperCase();
    const f = data?.features.find((x) => x.properties.code.toUpperCase() === q) ?? data?.features.find((x) => x.properties.code.toUpperCase().includes(q));
    if (!q || !f) return setSearchMsg("Aucun périmètre ne correspond à ce code.");
    const c = center(f);
    setVisible((v) => new Set(v).add(f.properties.status));
    setSelectedId(f.properties.id);
    setFly({ ...c, zoom: 12, nonce: Date.now() });
  }

  const p = selected?.properties;
  return (
    <div className="flex h-screen flex-col">
      <AppHeader user={user} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_1fr]">
        <aside className="overflow-y-auto border-b border-line bg-panel p-4 lg:border-b-0 lg:border-r">
          <h1 className="font-display text-2xl font-bold">Géo-cadastre minier</h1>
          <p className="mt-1 text-sm text-muted">Statut en temps réel des carrés miniers de la RDC.</p>

          <form onSubmit={find} className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input className="input pl-9" placeholder="Code du titre (ex. PE-13017)" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Rechercher un titre par code" />
            </div>
            <button className="btn-ghost px-3">OK</button>
          </form>
          {searchMsg && <p className="mt-2 text-xs text-brand">{searchMsg}</p>}

          <section className="mt-5">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Statut</h2>
            <ul className="space-y-1.5">
              {MAP_STATUSES.map((s) => (
                <li key={s}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-white/5">
                    <input type="checkbox" className="sr-only" checked={visible.has(s)} onChange={() => toggle(s)} />
                    <span className="h-3.5 w-3.5 rounded-sm border-2 transition-opacity" style={{ background: visible.has(s) ? STATUS_COLOR[s].fill : "transparent", borderColor: STATUS_COLOR[s].stroke }} aria-hidden />
                    <span className={`flex-1 ${visible.has(s) ? "" : "text-muted line-through"}`}>{TITLE_STATUS_LABEL[s]}</span>
                    <span className="num text-xs text-muted">{data?.counts[s] ?? 0}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-5 grid gap-3">
            <div>
              <label htmlFor="f-type" className="label">Type de permis</label>
              <select id="f-type" className="input" value={type} onChange={(e) => setType(e.target.value as PermitType | "")}>
                <option value="">Tous</option>
                {PERMIT_TYPES.map((t) => <option key={t} value={t}>{PERMIT_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-sub" className="label">Substance minérale</label>
              <select id="f-sub" className="input" value={substance} onChange={(e) => setSubstance(e.target.value as Substance | "")}>
                <option value="">Toutes</option>
                {SUBSTANCES.map((s) => <option key={s} value={s}>{SUBSTANCE_LABEL[s]}</option>)}
              </select>
            </div>
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Aller à</h2>
            <div className="grid grid-cols-2 gap-2">
              {ZONES.map((z) => (
                <button key={z.label} className="btn-ghost px-3 py-2 text-xs" onClick={() => setFly({ lat: z.lat, lng: z.lng, zoom: z.zoom, nonce: Date.now() })}>
                  <MapPin size={14} aria-hidden /> {z.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{PROVINCES.length} provinces · {Object.keys(CLUSTERS).length} zones de démonstration</p>
          </section>

          <div className="mt-5"><ErrorBox message={error} /></div>
        </aside>

        <div className="relative min-h-[60vh]">
          <GeoMap data={shown} selectedId={selectedId} onSelect={setSelectedId} flyTo={fly} />

          {p && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-sm rounded-lg border border-line bg-panel/95 p-4 shadow-xl backdrop-blur sm:right-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg">{p.code}</p>
                  <p className="text-xs text-muted">{p.locality}, {p.province}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="text-muted hover:text-white" aria-label="Fermer la fiche">✕</button>
              </div>
              <div className="mt-2"><TitleStatusBadge status={p.status} /></div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-xs text-muted">Type</dt><dd>{p.type ? PERMIT_LABEL[p.type] : "—"}</dd></div>
                <div><dt className="text-xs text-muted">Superficie</dt><dd className="num">{p.areaHa ? `${fmtNum(p.areaHa)} ha` : "—"}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-muted">Substances</dt><dd>{p.substances.length ? p.substances.map((s) => SUBSTANCE_LABEL[s]).join(", ") : "—"}</dd></div>
                {data?.authenticated ? (
                  <>
                    <div className="col-span-2"><dt className="text-xs text-muted">Titulaire</dt><dd>{p.holderName ?? "—"}</dd></div>
                    {p.expiresAt && <div className="col-span-2"><dt className="text-xs text-muted">Échéance du titre</dt><dd className="num">{fmtDate(p.expiresAt)}</dd></div>}
                  </>
                ) : (
                  <p className="col-span-2 text-xs text-muted">Connectez-vous pour consulter le titulaire et les échéances.</p>
                )}
              </dl>
              {p.status === "FREE" && (
                <Link href={user?.role === "APPLICANT" ? "/applicant/new" : "/login"} className="btn-primary mt-4 w-full">Déposer une demande sur cette zone</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
