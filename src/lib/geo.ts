import type { Prisma, PrismaClient } from "@prisma/client";
import type { Geometry } from "geojson";
import { AREA_LIMITS_HA, DRC_BOUNDS } from "./constants";
import type { CheckResult, ConflictView } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

/** Contrôles de forme (sans base de données). Renvoie un message d'erreur ou null. */
export function validateRing(ring: unknown): string | null {
  if (!Array.isArray(ring) || ring.length < 4) return "Un polygone nécessite au moins 3 sommets.";
  if (ring.length > 501) return "Polygone trop complexe (500 sommets maximum).";
  for (const p of ring) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every((n) => typeof n === "number" && Number.isFinite(n))) return "Coordonnées invalides.";
    const [lng, lat] = p as number[];
    if (lat < DRC_BOUNDS.minLat || lat > DRC_BOUNDS.maxLat || lng < DRC_BOUNDS.minLng || lng > DRC_BOUNDS.maxLng)
      return "Au moins un sommet se situe hors du territoire de la RDC.";
  }
  const a = ring[0] as number[], b = ring[ring.length - 1] as number[];
  if (a[0] !== b[0] || a[1] !== b[1]) return "Le polygone n'est pas fermé.";
  if (new Set(ring.slice(0, -1).map((p) => (p as number[]).join(","))).size < 3) return "Au moins 3 sommets distincts sont requis.";
  return null;
}

export const ringToGeoJSON = (ring: number[][]) => JSON.stringify({ type: "Polygon", coordinates: [ring] });

export async function measure(db: Db, gj: string) {
  const rows = await db.$queryRaw<{ valid: boolean; reason: string; areaHa: number }[]>`
    SELECT ST_IsValid(g.geom) AS valid, ST_IsValidReason(g.geom) AS reason,
           (ST_Area(g.geom::geography) / 10000.0)::float8 AS "areaHa"
    FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${gj}::text), 4326) AS geom) g`;
  return rows[0];
}

/** Titres bloquants (attribués, en instruction, réservés) qui empiètent réellement sur le polygone (le simple contact de bordure est toléré). */
export async function findConflicts(db: Db, gj: string, excludeTitleId = ""): Promise<ConflictView[]> {
  const rows = await db.$queryRaw<{ id: string; overlapHa: number; overlapGeo: string }[]>`
    SELECT * FROM (
      SELECT t.id,
             (ST_Area(ST_Intersection(t.geom, n.geom)::geography) / 10000.0)::float8 AS "overlapHa",
             ST_AsGeoJSON(ST_CollectionExtract(ST_Intersection(t.geom, n.geom), 3), 6) AS "overlapGeo"
      FROM "Title" t
      CROSS JOIN (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${gj}::text), 4326) AS geom) n
      WHERE t.geom IS NOT NULL
        AND t.status IN ('ATTRIBUTED', 'PENDING', 'RESERVED')
        AND t.id <> ${excludeTitleId}
        AND t.geom && n.geom
        AND ST_Intersects(t.geom, n.geom)
        AND NOT ST_Touches(t.geom, n.geom)
    ) x WHERE x."overlapHa" > 0.01 ORDER BY x."overlapHa" DESC`;
  if (!rows.length) return [];
  const titles = await db.title.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    select: { id: true, code: true, status: true, type: true, holderName: true },
  });
  return rows.flatMap((r) => {
    const t = titles.find((x) => x.id === r.id);
    if (!t) return [];
    return [{ titleId: t.id, code: t.code, status: t.status, type: t.type, holderName: t.holderName, overlapHa: Math.round(r.overlapHa * 100) / 100, geometry: JSON.parse(r.overlapGeo) as Geometry }];
  });
}

/** Analyse complète : forme → validité PostGIS → surface → chevauchements. */
export async function analyzeRing(db: Db, ring: unknown, excludeTitleId = ""): Promise<CheckResult & { geojson?: string }> {
  const shape = validateRing(ring);
  if (shape) return { ok: false, error: shape, conflicts: [] };
  const gj = ringToGeoJSON(ring as number[][]);
  const m = await measure(db, gj);
  if (!m.valid) return { ok: false, error: `Polygone invalide : arêtes qui se croisent ou géométrie dégénérée (${m.reason}).`, conflicts: [] };
  if (m.areaHa < AREA_LIMITS_HA.min) return { ok: false, error: `Surface trop faible (${m.areaHa.toFixed(1)} ha). Minimum : ${AREA_LIMITS_HA.min} ha.`, areaHa: m.areaHa, conflicts: [] };
  if (m.areaHa > AREA_LIMITS_HA.max) return { ok: false, error: `Surface trop grande (${Math.round(m.areaHa)} ha). Maximum : ${AREA_LIMITS_HA.max} ha.`, areaHa: m.areaHa, conflicts: [] };
  const conflicts = await findConflicts(db, gj, excludeTitleId);
  return { ok: true, areaHa: Math.round(m.areaHa * 100) / 100, conflicts, geojson: gj };
}

export async function titleGeometry(db: Db, titleId: string): Promise<Geometry | null> {
  const rows = await db.$queryRaw<{ g: string | null }[]>`SELECT ST_AsGeoJSON(geom, 6) AS g FROM "Title" WHERE id = ${titleId}`;
  return rows[0]?.g ? (JSON.parse(rows[0].g) as Geometry) : null;
}
