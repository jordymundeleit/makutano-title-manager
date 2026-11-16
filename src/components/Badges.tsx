import { APP_STATUS_LABEL, STATUS_COLOR, TITLE_STATUS_LABEL, type AppStatus, type TitleStatus } from "@/lib/constants";

export function TitleStatusBadge({ status }: { status: TitleStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white/5 px-2.5 py-0.5 text-xs font-medium">
      <span className="h-2 w-2 rounded-full" style={{ background: c.fill, boxShadow: `0 0 0 1px ${c.stroke}` }} aria-hidden />
      {TITLE_STATUS_LABEL[status]}
    </span>
  );
}

const APP_STYLE: Record<AppStatus, string> = {
  SUBMITTED: "border-line bg-white/5 text-white",
  IN_INSTRUCTION: "border-orange-500/50 bg-orange-500/10 text-orange-400",
  INSTRUCTED: "border-mining/50 bg-mining/10 text-mining",
  APPROVED: "border-gold bg-gold/15 text-gold",
  REJECTED: "border-brand bg-brand/15 text-brand",
};
export function AppStatusBadge({ status }: { status: AppStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${APP_STYLE[status]}`}>{APP_STATUS_LABEL[status]}</span>;
}

const STEPS: AppStatus[] = ["SUBMITTED", "IN_INSTRUCTION", "INSTRUCTED", "APPROVED"];
export function AppStepper({ status }: { status: AppStatus }) {
  const rejected = status === "REJECTED";
  const idx = rejected ? 2 : STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-1.5" aria-label="Avancement du dossier">
      {STEPS.map((s, i) => {
        const last = i === STEPS.length - 1;
        const color = rejected && last ? "bg-brand" : i <= idx ? (status === "APPROVED" ? "bg-gold" : "bg-mining") : "bg-line";
        return (
          <li key={s}>
            <div className={`h-1.5 rounded-full ${color}`} />
            <p className={`mt-1.5 text-xs leading-tight ${i === idx || (rejected && last) ? "text-white" : "text-muted"}`}>
              {rejected && last ? APP_STATUS_LABEL.REJECTED : APP_STATUS_LABEL[s]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
