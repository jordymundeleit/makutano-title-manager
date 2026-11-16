"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Geometry } from "geojson";
import { CheckCircle2, FileUp, Loader2, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { api } from "@/lib/client";
import { DOC_LABEL, MAX_FILE_BYTES, PERMIT_LABEL, PERMIT_TYPES, PROVINCES, SUBSTANCES, SUBSTANCE_LABEL, TITLE_STATUS_LABEL, type DocKind, type PermitType, type Substance } from "@/lib/constants";
import { importFileText, parseCoordinates, toRing } from "@/lib/coords";
import { DEMO_EXAMPLES } from "@/lib/demo-geo";
import { fmtNum } from "@/lib/format";
import type { CheckResult, TitleCollection } from "@/lib/types";
import { ErrorBox, Loading } from "@/components/Feedback";

const GeoMap = dynamic(() => import("@/components/GeoMap"), { ssr: false, loading: () => <Loading label="Chargement de la carte…" /> });

export default function NewApplicationForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [permitType, setPermitType] = useState<PermitType>("RESEARCH");
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [province, setProvince] = useState<(typeof PROVINCES)[number]>("Lualaba");
  const [locality, setLocality] = useState("");
  const [coordText, setCoordText] = useState("");
  const [files, setFiles] = useState<Partial<Record<DocKind, File>>>({});
  const [context, setContext] = useState<TitleCollection | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [focus, setFocus] = useState<Geometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ref: string; code: string; areaHa: number } | null>(null);
  const seq = useRef(0);

  const parsed = useMemo(() => parseCoordinates(coordText), [coordText]);
  const ring = useMemo(() => (parsed.points.length >= 3 && !parsed.error ? toRing(parsed.points) : null), [parsed]);
  const required: DocKind[] = permitType === "EXPLOITATION" ? ["STATUTS", "RCCM", "EIE"] : ["STATUTS", "RCCM"];

  useEffect(() => { api<TitleCollection>("/api/titles").then(setContext).catch(() => {}); }, []);

  // Détection automatique des chevauchements (instantanée, avec anti-rebond)
  useEffect(() => {
    if (!ring) { setCheck(null); setChecking(false); return; }
    const my = ++seq.current;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await api<CheckResult>("/api/check-overlap", { method: "POST", json: { ring } });
        if (my === seq.current) setCheck(res);
      } catch (e) {
        if (my === seq.current) setCheck({ ok: false, error: e instanceof Error ? e.message : "Vérification impossible.", conflicts: [] });
      } finally { if (my === seq.current) setChecking(false); }
    }, 450);
    return () => clearTimeout(t);
  }, [ring]);

  const loadText = (text: string, zoom = true) => {
    setCoordText(text);
    if (zoom) {
      const p = parseCoordinates(text);
      if (p.points.length >= 3) setFocus({ type: "Polygon", coordinates: [toRing(p.points)] });
    }
  };

  async function importFile(file: File | undefined) {
    if (!file) return;
    try { loadText(importFileText(await file.text())); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Fichier illisible."); }
  }

  const setFile = (k: DocKind, f: File | undefined) => {
    if (f && f.size > MAX_FILE_BYTES) { setError(`« ${f.name} » dépasse 3 Mo.`); return; }
    setError(null); setFiles((x) => ({ ...x, [k]: f }));
  };

  const hasConflict = (check?.conflicts.length ?? 0) > 0;
  const ready = !!ring && !!check?.ok && !hasConflict && !checking && substances.length > 0 && locality.trim().length >= 2 && required.every((k) => files[k]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ring) return;
    setSubmitting(true); setError(null);
    const form = new FormData();
    form.set("permitType", permitType); form.set("substances", JSON.stringify(substances)); form.set("province", province);
    form.set("locality", locality.trim()); form.set("ring", JSON.stringify(ring));
    for (const [k, f] of Object.entries(files)) if (f) form.set(`doc_${k}`, f);
    try {
      setDone(await api<{ ref: string; code: string; areaHa: number }>("/api/applications", { method: "POST", form }));
    } catch (err) {
      const data = (err as { data?: { conflicts?: CheckResult["conflicts"] } }).data;
      if (data?.conflicts) setCheck({ ok: true, conflicts: data.conflicts });
      setError(err instanceof Error ? err.message : "Dépôt impossible.");
    } finally { setSubmitting(false); }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 size={48} className="mx-auto text-gold" aria-hidden />
        <h1 className="mt-4 font-display text-4xl font-bold">Demande déposée</h1>
        <p className="mt-3 text-muted">Votre dossier <span className="font-mono text-white">{done.ref}</span> ({fmtNum(done.areaHa, 1)} ha) est enregistré. Le périmètre <span className="font-mono text-white">{done.code}</span> apparaît désormais « en cours d'instruction » sur la carte.</p>
        <div className="mt-6 flex justify-center gap-3"><Link href="/applicant" className="btn-primary">Suivre mon dossier</Link><Link href="/" className="btn-ghost">Voir la carte</Link></div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[520px_1fr]">
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div><h1 className="font-display text-3xl font-bold">Demande de titre minier</h1><p className="mt-1 text-sm text-muted">Le périmètre est contrôlé automatiquement avant tout dépôt.</p></div>

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">1. Titre demandé</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="pt" className="label">Type de permis</label><select id="pt" className="input" value={permitType} onChange={(e) => setPermitType(e.target.value as PermitType)}>{PERMIT_TYPES.map((t) => <option key={t} value={t}>{PERMIT_LABEL[t]}</option>)}</select></div>
            <div><label htmlFor="prov" className="label">Province</label><select id="prov" className="input" value={province} onChange={(e) => setProvince(e.target.value as typeof province)}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div className="sm:col-span-2"><label htmlFor="loc" className="label">Localité / territoire</label><input id="loc" className="input" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="ex. Kolwezi" /></div>
          </div>
          <fieldset><legend className="label">Substances minérales</legend>
            <div className="flex flex-wrap gap-4">{SUBSTANCES.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#E53935]" checked={substances.includes(s)} onChange={() => setSubstances((x) => x.includes(s) ? x.filter((y) => y !== s) : [...x, s])} /> {SUBSTANCE_LABEL[s]}</label>
            ))}</div>
          </fieldset>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">2. Périmètre (polygone)</h2>
          <p className="text-sm text-muted">Cliquez sur la carte pour poser les sommets, collez des coordonnées ou importez un fichier GeoJSON / CSV.</p>
          <textarea className="input num min-h-[120px] font-mono text-xs" value={coordText} onChange={(e) => setCoordText(e.target.value)} placeholder={"latitude, longitude (une ligne par sommet)\n-10.8, 25.3\n-10.8, 25.31\n-10.79, 25.31"} aria-label="Coordonnées du polygone" />
          <div className="flex flex-wrap gap-2">
            <label className="btn-ghost cursor-pointer text-xs"><Upload size={14} /> Importer GeoJSON / CSV<input type="file" accept=".geojson,.json,.csv,.txt" className="sr-only" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
            <button type="button" className="btn-ghost text-xs" disabled={!parsed.points.length} onClick={() => loadText(parsed.points.slice(0, -1).map(([a, b]) => `${a}, ${b}`).join("\n"), false)}>Annuler le dernier point</button>
            <button type="button" className="btn-ghost text-xs" disabled={!coordText} onClick={() => { setCoordText(""); setFocus(null); }}>Effacer</button>
          </div>
          {demo && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <span className="w-full text-xs text-muted">Exemples de démonstration</span>
              <button type="button" className="btn-ghost text-xs" onClick={() => { setProvince("Lualaba"); setLocality("Kolwezi"); loadText(DEMO_EXAMPLES.free); }}>Zone libre (Kolwezi)</button>
              <button type="button" className="btn-ghost text-xs" onClick={() => { setProvince("Lualaba"); setLocality("Kolwezi"); loadText(DEMO_EXAMPLES.overlap); }}>Zone en chevauchement</button>
            </div>
          )}
          {parsed.error && <ErrorBox message={parsed.error} />}
          {ring && checking && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 size={14} className="animate-spin" /> Analyse géospatiale…</p>}
          {ring && !checking && check && (
            check.error ? <ErrorBox message={check.error} />
            : hasConflict ? (
              <div role="alert" className="rounded-md border border-brand bg-brand/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold"><ShieldAlert size={16} className="text-brand" aria-hidden /> Chevauchement détecté : dépôt bloqué</p>
                <ul className="mt-2 space-y-1 text-white/90">{check.conflicts.map((c) => (
                  <li key={c.titleId}><span className="font-mono">{c.code}</span> · {TITLE_STATUS_LABEL[c.status]} · <span className="num">{fmtNum(c.overlapHa, 2)} ha</span> en commun{c.holderName ? ` · ${c.holderName}` : ""}</li>
                ))}</ul>
                <p className="mt-2 text-xs text-muted">Modifiez votre périmètre : la zone en conflit est surlignée sur la carte.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-gold/50 bg-gold/10 px-3 py-2.5 text-sm"><ShieldCheck size={16} className="text-gold" aria-hidden /> Aucun chevauchement. Superficie : <strong className="num">{fmtNum(check.areaHa ?? 0, 1)} ha</strong></div>
            )
          )}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">3. Pièces justificatives</h2>
          <p className="text-xs text-muted">PDF, PNG ou JPEG · 3 Mo maximum par fichier · 4 Mo au total.</p>
          {(["STATUTS", "RCCM", "EIE"] as DocKind[]).map((k) => (
            <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5 text-sm hover:border-mining">
              <span className="flex min-w-0 items-center gap-2"><FileUp size={16} className="shrink-0 text-mining" aria-hidden /><span className="truncate">{DOC_LABEL[k]}{required.includes(k) ? <span className="text-brand"> *</span> : <span className="text-muted"> (facultatif)</span>}</span></span>
              <span className="max-w-[45%] truncate text-xs text-muted">{files[k]?.name ?? "Choisir un fichier"}</span>
              <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" onChange={(e) => setFile(k, e.target.files?.[0])} />
            </label>
          ))}
        </section>

        <ErrorBox message={error} />
        <button className="btn-primary w-full py-3" disabled={!ready || submitting}>{submitting && <Loader2 size={16} className="animate-spin" />} Déposer la demande</button>
        {!ready && <p className="text-center text-xs text-muted">Complétez le formulaire, joignez les pièces et obtenez un contrôle sans chevauchement pour activer le dépôt.</p>}
      </form>

      <div className="h-[70vh] overflow-hidden rounded-lg border border-line lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
        <GeoMap data={context} draft={parsed.points} conflicts={check?.conflicts.map((c) => c.geometry)} focus={focus} onMapClick={(lat, lng) => setCoordText((t) => `${t.trim() ? t.trimEnd() + "\n" : ""}${lat.toFixed(6)}, ${lng.toFixed(6)}`)} />
      </div>
    </main>
  );
}
