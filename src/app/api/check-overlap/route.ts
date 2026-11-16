import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { analyzeRing } from "@/lib/geo";
import { ok, requireRole, route } from "@/lib/api";

export const dynamic = "force-dynamic";
const schema = z.object({ ring: z.array(z.array(z.number()).length(2)).max(600, "Polygone trop complexe.") });

/** Vérification instantanée avant dépôt (aucune écriture). */
export const POST = route(async (req: Request) => {
  const auth = await requireRole(["ADMIN", "INSPECTOR", "APPLICANT"]);
  if (!auth.ok) return auth.response;
  const { ring } = schema.parse(await req.json().catch(() => ({})));
  const { geojson, ...result } = await analyzeRing(prisma, ring);
  void geojson;
  return ok(result);
});
