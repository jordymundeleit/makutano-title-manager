"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, Landmark, Loader2, ShieldCheck, Satellite } from "lucide-react";
import { api } from "@/lib/client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";
import { ErrorBox } from "@/components/Feedback";

export default function LoginForm({ demo }: { demo: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(targetEmail: string, targetPass: string, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await api<{ redirect: string }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });
      // Redirection directe par le navigateur pour valider le cookie de session
      window.location.href = res.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
      setBusy(null);
    }
  }

  const quick = [
    { key: "admin", icon: ShieldCheck, ...DEMO_ACCOUNTS.admin },
    { key: "inspector", icon: Satellite, ...DEMO_ACCOUNTS.inspector },
    { key: "applicant", icon: Briefcase, ...DEMO_ACCOUNTS.applicant },
  ];

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between border-r border-line bg-panel/50 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Landmark className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-wide">Makutano Mining</span>
        </div>
        <div>
          <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight">
            Gestion transparente des titres miniers.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Chaque demande est contrôlée par le moteur géospatial avant son dépôt officiel.
          </p>
          <ul className="mt-8 max-w-md space-y-3 text-sm">
            {[
              ["#22C55E", "Libre"],
              ["#E53935", "Occupé / attribué"],
              ["#F83CB8", "Réservé / en instance"],
            ].map(([color, label]) => (
              <li key={label} className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted">Démonstration – Forum Makutano Mining, Kinshasa 2026</p>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <h2 className="font-display text-3xl font-bold">Connexion</h2>
          <p className="mt-1 text-sm text-muted">Accédez à votre espace sécurisé.</p>
          
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(email, password, "form");
            }}
          >
            <div>
              <label htmlFor="email" className="label">Adresse e-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@entreprise.cd"
                className="input mt-1.5 w-full"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Mot de passe ou code démo</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Makutano2026"
                className="input mt-1.5 w-full"
              />
            </div>

            <ErrorBox message={error} />

            <button
              type="submit"
              disabled={busy !== null}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {busy === "form" && <Loader2 className="h-4 w-4 animate-spin" />}
              Se connecter
            </button>
          </form>

          <p className="mt-4 text-sm text-muted">
            Société minière ? <Link href="/register" className="text-mining hover:underline font-medium">Créer un compte demandeur</Link>
          </p>

          {demo && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-sm font-medium">Connexion rapide (démonstration)</p>
              <div className="mt-3 grid gap-2.5">
                {quick.map((q) => {
                  const Icon = q.icon;
                  const isBusy = busy === q.key;
                  return (
                    <button
                      key={q.key}
                      type="button"
                      disabled={busy !== null}
                      onClick={() => handleLogin(q.email, DEMO_PASSWORD, q.key)}
                      className="flex items-center gap-3.5 rounded-xl border border-line bg-panel p-3.5 text-left transition hover:border-primary/50 disabled:opacity-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium leading-snug">{q.label}</p>
                        <p className="text-xs text-muted">{q.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}