import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { MAP_STATUSES, PERMIT_TYPES, SUBSTANCES, type PermitType, type Substance } from "@/lib/constants";
import type { TitleCollection, TitleFeature } from "@/lib/types";
import type { Geometry } from "geojson";

export const dynamic = "force-dynamic";

/** Géo-cadastre : public (code, statut, type, substances, surface). Titulaire et dates réservés aux utilisateurs connectés. */
export const GET = route(async (req: Request) => {
  const user = await getSessionUser();
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") as PermitType | null;
  const substance = sp.get("substance") as Substance | null;
  const staff = !!user && user.role !== "APPLICANT";
  const all = staff && sp.get("all") === "1";

  const and: Prisma.TitleWhereInput[] = [];
  if (type && (PERMIT_TYPES as readonly string[]).includes(type)) and.push({ OR: [{ status: { in: ["FREE", "RESERVED"] } }, { type }] });
  if (substance && (SUBSTANCES as readonly string[]).includes(substance)) and.push({ OR: [{ status: { in: ["FREE", "RESERVED"] } }, { substances: { has: substance } }] });

  const rows = await prisma.title.findMany({
    where: { ...(all ? {} : { status: { in: [...MAP_STATUSES] } }), AND: and },
    select: { id: true, code: true, status: true, type: true, substances: true, areaHa: true, province: true, locality: true, holderName: true, grantedAt: true, expiresAt: true },
    orderBy: { code: "asc" },
  });

  const ids = rows.map((r) => r.id);
  const geoms = ids.length
    ? await prisma.$queryRaw<{ id: string; g: string }[]>`SELECT id, ST_AsGeoJSON(geom, 5) AS g FROM "Title" WHERE geom IS NOT NULL AND id = ANY(${ids}::text[])`
    : [];
  const gmap = new Map(geoms.map((g) => [g.id, JSON.parse(g.g) as Geometry]));

  const counts: Record<string, number> = {};
  const features: TitleFeature[] = rows.flatMap((r) => {
    const geometry = gmap.get(r.id);
    if (!geometry) return [];
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    return [{
      type: "Feature" as const, id: r.id, geometry,
      properties: {
        id: r.id, code: r.code, status: r.status, type: r.type, substances: r.substances, areaHa: r.areaHa, province: r.province, locality: r.locality,
        ...(user ? { holderName: r.holderName, grantedAt: r.grantedAt?.toISOString() ?? null, expiresAt: r.expiresAt?.toISOString() ?? null } : {}),
      },
    }];
  });
  const body: TitleCollection = { type: "FeatureCollection", features, counts, authenticated: !!user };
  return ok(body);
});
