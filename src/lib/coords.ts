export type LatLng = [number, number];

/** Texte « latitude, longitude » (une ligne par sommet, point décimal) → points. */
export function parseCoordinates(text: string): { points: LatLng[]; error: string | null } {
  const points: LatLng[] = [];
  let error: string | null = null;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  lines.forEach((line, i) => {
    if (error) return;
    const parts = line.replace(/[;,\t]/g, " ").split(/\s+/).filter(Boolean);
    const nums = parts.map(Number);
    if (parts.length !== 2 || nums.some((n) => !Number.isFinite(n))) {
      error = `Ligne ${i + 1} invalide : attendu « latitude, longitude » avec un point décimal (ex. -10.7167, 25.4667).`;
      return;
    }
    const [lat, lng] = nums;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      error = `Ligne ${i + 1} : coordonnées hors limites.`;
      return;
    }
    points.push([lat, lng]);
  });
  if (points.length > 1) {
    const a = points[0], b = points[points.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) points.pop(); // polygone déjà fermé
  }
  return { points, error };
}

/** Points (lat,lng) → anneau GeoJSON fermé [lng,lat]. */
export function toRing(points: LatLng[]): number[][] {
  const ring = points.map(([lat, lng]) => [lng, lat]);
  if (ring.length) ring.push(ring[0]);
  return ring;
}

export const pointsToText = (points: LatLng[]) => points.map(([a, b]) => `${a.toFixed(6)}, ${b.toFixed(6)}`).join("\n");

/** Importe un fichier GeoJSON (Polygon / Feature / FeatureCollection / MultiPolygon) ou un CSV lat,lng. */
export function importFileText(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("{")) return t;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const find = (o: any): number[][] | null => {
    if (!o) return null;
    if (o.type === "FeatureCollection") for (const f of o.features ?? []) { const r = find(f); if (r) return r; }
    if (o.type === "Feature") return find(o.geometry);
    if (o.type === "Polygon") return o.coordinates?.[0] ?? null;
    if (o.type === "MultiPolygon") return o.coordinates?.[0]?.[0] ?? null;
    return null;
  };
  const ring = find(JSON.parse(t));
  if (!ring) throw new Error("Aucun polygone trouvé dans ce fichier GeoJSON.");
  return pointsToText(ring.map(([lng, lat]) => [lat, lng] as LatLng));
}
