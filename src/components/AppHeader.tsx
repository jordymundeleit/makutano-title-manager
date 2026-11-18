"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Loader2, LogOut, Map as MapIcon } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { api } from "@/lib/client";

export function AppHeader({ user, subtitle }: { user: { name: string; role: Role } | null; subtitle?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
    async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  const home = user ? (user.role === "APPLICANT" ? "/applicant" : "/admin") : "/login";
  return (
    <header className="sticky top-0 z-[1100] border-b border-line bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand" aria-hidden><Landmark size={20} /></span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-bold tracking-wide">Makutano Mining Title Manager</span>
            <span className="block text-xs text-muted">{subtitle ?? "Cadastre minier numérique · RDC"}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/" className="btn-ghost px-3"><MapIcon size={16} /><span className="hidden sm:inline">Carte</span></Link>
          {user ? (
            <>
              <Link href={home} className="btn-ghost px-3"><span className="hidden text-mining sm:inline">{ROLE_LABEL[user.role]}</span><span className="sm:hidden">Mon espace</span></Link>
              <button onClick={logout} disabled={busy} className="btn-ghost px-3" aria-label="Se déconnecter">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              </button>
            </>
          ) : (
            <>
              <Link href="/register" className="btn-ghost hidden sm:inline-flex">Créer un compte</Link>
              <Link href="/login" className="btn-primary">Connexion</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
