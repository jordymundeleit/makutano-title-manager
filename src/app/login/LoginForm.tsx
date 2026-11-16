"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Landmark, Loader2, ShieldCheck, Satellite } from "lucide-react";
import { api } from "@/lib/client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { ErrorBox } from "@/components/Feedback";

export default function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(e: string, p: string, key: string) {
    setBusy(key); setError(null);
    try {
      const res = await api<{ redirect: string }>("/api/auth/login", { method: "POST", json: { email: e, password: p } });
      router.push(res.redirect); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible."); setBusy(null);
    }
  }
  const quick = [
    { key: "admin", icon: ShieldCheck, ...DEMO_ACCOUNTS.admin },
    { key: "inspector", icon: Satellite, ...DEMO_ACCOUNTS.inspector },
    { key: "applicant", icon: Briefcase, ...DEMO_ACCOUNTS.applicant },
  ];

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-line bg-panel p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand" aria-hidden><Landmark size={22} /></span>
          <span className="font-display text-xl font-bold tracking-wide">Makutano Mining Title Manager</span>
        </div>
        <div>
          <h1 className="font-display text-6xl font-bold leading-[0.95]">Un carré minier, un seul titulaire. Vérifié par la carte.</h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Chaque demande est contrôlée par le moteur géospatial avant son dépôt. Un chevauchement avec un titre existant bloque la soumission, sans intervention humaine.
          </p>
          <ul className="mt-8 max-w-md space-y-3 text-sm">
            {[["#22C55E", "Libre"], ["#E53935", "Occupé / attribué"], ["#FB8C00", "En cours d'instruction"], ["#9E9E9E", "Zone réservée"]].map(([c, l]) => (
              <li key={l} className="flex items-center gap-3"><span className="h-3.5 w-3.5 rounded-sm" style={{ background: c }} aria-hidden /> {l}</li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted">Démonstration — Forum Makutano Mining, Kinshasa</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <h2 className="font-display text-3xl font-bold">Connexion</h2>
          <p className="mt-1 text-sm text-muted">Accédez à votre espace sécurisé.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); login(email, password, "form"); }}>
            <div><label htmlFor="email" className="label">Adresse e-mail</label><input id="email" type="email" required autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label htmlFor="password" className="label">Mot de passe</label><input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <ErrorBox message={error} />
            <button className="btn-primary w-full" disabled={busy !== null}>{busy === "form" && <Loader2 size={16} className="animate-spin" />} Se connecter</button>
          </form>
          <p className="mt-4 text-sm text-muted">
            Société minière ? <Link href="/register" className="text-mining hover:underline">Créer un compte demandeur</Link> · <Link href="/" className="text-mining hover:underline">Voir la carte publique</Link>
          </p>

          {demo && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-sm font-medium">Connexion rapide (démonstration)</p>
              <div className="mt-3 grid gap-2.5">
                {quick.map((q) => (
                  <button key={q.key} disabled={busy !== null} onClick={() => login(q.email, DEMO_PASSWORD, q.key)} className="card flex items-center gap-3 px-4 py-3 text-left transition-colors hover:border-mining disabled:opacity-60">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-mining/10 text-mining">{busy === q.key ? <Loader2 size={18} className="animate-spin" /> : <q.icon size={18} />}</span>
                    <span className="leading-tight"><span className="block text-sm font-semibold">{q.label}</span><span className="block text-xs text-muted">{q.hint}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
