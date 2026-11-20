"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, Landmark, Loader2, ShieldCheck, Satellite, AlertCircle } from "lucide-react";
import { api } from "@/lib/client";
import { DEMO_PASSWORD, type Role } from "@/lib/constants";
import { ErrorBox } from "@/components/Feedback";

type RoleOption = {
  id: Role;
  label: string;
  shortLabel: string;
  desc: string;
  icon: typeof Briefcase;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "APPLICANT",
    label: "Demandeur (Société minière)",
    shortLabel: "Demandeur",
    desc: "Déposer une demande de titre et suivre ses dossiers",
    icon: Briefcase,
  },
  {
    id: "INSPECTOR",
    label: "Inspecteur SIG",
    shortLabel: "Inspecteur SIG",
    desc: "Instruction technique et contrôle géospatial des périmètres",
    icon: Satellite,
  },
  {
    id: "ADMIN",
    label: "Admin Ministère",
    shortLabel: "Ministère",
    desc: "Décisions administratives, redevances et journal d'audit",
    icon: ShieldCheck,
  },
];

export default function LoginForm({ demo }: { demo: boolean }) {
  const [selectedRole, setSelectedRole] = useState<Role>("APPLICANT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(demo ? DEMO_PASSWORD : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeOption =
    ROLE_OPTIONS.find((item) => item.id === selectedRole) || ROLE_OPTIONS[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await api<{ redirect: string }>("/api/auth/login", {
        method: "POST",
        json: {
          email: email.trim(),
          password: password.trim(),
          role: selectedRole,
        },
      });
      window.location.href = res.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
      setBusy(false);
    }
  }

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
          <p className="mt-1 text-sm text-muted">
            Choisissez un profil, renseignez votre e-mail et entrez le code d&apos;accès.
          </p>

          {/* Barre d'indication claire du profil actif */}
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-red-200">
                Connexion requise — Espace {activeOption.label}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {activeOption.desc}. Saisissez votre e-mail et le code{" "}
                <span className="font-semibold text-white">{DEMO_PASSWORD}</span>.
              </p>
            </div>
          </div>

          {/* Sélecteur de rôle */}
          <div className="mt-5">
            <span className="label block">Profil d&apos;accès</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedRole === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSelectedRole(option.id);
                      setError(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
                      isSelected
                        ? "border-primary bg-primary/15 text-white"
                        : "border-line bg-panel text-muted hover:border-primary/40 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-semibold leading-tight">{option.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="label">
                Adresse e-mail ({activeOption.shortLabel})
              </label>
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
              <label htmlFor="password" className="label">
                Mot de passe ou code démo
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={DEMO_PASSWORD}
                className="input mt-1.5 w-full"
              />
            </div>

            <ErrorBox message={error} />

            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Accéder à l&apos;espace {activeOption.shortLabel}
            </button>
          </form>

          <p className="mt-4 text-sm text-muted">
            Société minière ?{" "}
            <Link href="/register" className="font-medium text-mining hover:underline">
              Créer un compte demandeur
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}