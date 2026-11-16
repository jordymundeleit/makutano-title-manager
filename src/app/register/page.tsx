"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/Feedback";

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ company: "", rccm: "", name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const res = await api<{ redirect: string }>("/api/auth/register", { method: "POST", json: f });
      router.push(res.redirect); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Inscription impossible."); setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <form onSubmit={submit} className="card w-full space-y-4 p-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Compte demandeur</h1>
          <p className="mt-1 text-sm text-muted">Réservé aux sociétés enregistrées (RCCM) souhaitant déposer une demande de titre minier.</p>
        </div>
        <div><label className="label" htmlFor="company">Raison sociale</label><input id="company" required className="input" value={f.company} onChange={set("company")} /></div>
        <div><label className="label" htmlFor="rccm">Numéro RCCM</label><input id="rccm" required className="input" value={f.rccm} onChange={set("rccm")} placeholder="CD/KWZ/RCCM/24-B-0000" /></div>
        <div><label className="label" htmlFor="name">Représentant légal</label><input id="name" required className="input" value={f.name} onChange={set("name")} /></div>
        <div><label className="label" htmlFor="email">Adresse e-mail</label><input id="email" type="email" required autoComplete="username" className="input" value={f.email} onChange={set("email")} /></div>
        <div><label className="label" htmlFor="password">Mot de passe (8 caractères min.)</label><input id="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={f.password} onChange={set("password")} /></div>
        <ErrorBox message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Créer mon compte</button>
        <p className="text-center text-sm text-muted">Déjà inscrit ? <Link href="/login" className="text-mining hover:underline">Se connecter</Link></p>
      </form>
    </main>
  );
}
