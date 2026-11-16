"use client";
import { useState } from "react";
import { Coins, FileStack, LayoutDashboard, Map as MapIcon, ScrollText } from "lucide-react";
import type { Role } from "@/lib/constants";
import Overview from "./Overview";
import ApplicationsPanel from "./ApplicationsPanel";
import FeesPanel from "./FeesPanel";
import TitlesPanel from "./TitlesPanel";
import AuditPanel from "./AuditPanel";

export default function AdminShell({ role }: { role: Role }) {
  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
    { id: "applications", label: "Demandes", icon: FileStack },
    { id: "titles", label: "Registre des titres", icon: MapIcon },
    ...(role === "ADMIN" ? [{ id: "fees", label: "Redevances", icon: Coins }, { id: "audit", label: "Journal d'audit", icon: ScrollText }] : []),
  ];
  const [tab, setTab] = useState("overview");
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === t.id ? "border-brand text-white" : "border-transparent text-muted hover:text-white"}`}>
            <t.icon size={16} aria-hidden /> {t.label}
          </button>
        ))}
      </nav>
      {tab === "overview" && <Overview role={role} goto={setTab} />}
      {tab === "applications" && <ApplicationsPanel role={role} />}
      {tab === "titles" && <TitlesPanel role={role} />}
      {tab === "fees" && role === "ADMIN" && <FeesPanel />}
      {tab === "audit" && role === "ADMIN" && <AuditPanel />}
    </div>
  );
}
