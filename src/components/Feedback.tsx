import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-brand/50 bg-brand/10 px-3 py-2.5 text-sm text-white">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function SuccessBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="flex items-start gap-2 rounded-md border border-gold/50 bg-gold/10 px-3 py-2.5 text-sm text-white">
      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted" role="status">
      <Loader2 size={16} className="animate-spin" aria-hidden /> {label}
    </div>
  );
}
