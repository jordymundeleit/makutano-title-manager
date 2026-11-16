import { computeAlerts } from "@/lib/alerts";
import { ok, requireRole, route } from "@/lib/api";

export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const auth = await requireRole(["ADMIN", "INSPECTOR", "APPLICANT"]);
  if (!auth.ok) return auth.response;
  return ok({ alerts: await computeAlerts(auth.user.role === "APPLICANT" ? auth.user.id : undefined) });
});
