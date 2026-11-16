export const fmtInt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
export const fmtNum = (n: number, d = 1) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d }).format(n);
export const fmtUsd = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const fmtUsd2 = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
export const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Kinshasa" });
export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kinshasa" });
export const daysUntil = (d: string | Date) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
