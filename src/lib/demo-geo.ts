// Grille cadastrale de démonstration (1 carré ≈ 85 ha). Utilisée par le seed ET par les exemples du formulaire.
export type ClusterKey = "KOL" | "TFM" | "LUB" | "WAL" | "KAM";
export type Cluster = { key: ClusterKey; name: string; province: string; lat: number; lng: number };

export const CLUSTERS: Record<ClusterKey, Cluster> = {
  KOL: { key: "KOL", name: "Kolwezi", province: "Lualaba", lat: -10.8, lng: 25.3 },
  TFM: { key: "TFM", name: "Tenke–Fungurume", province: "Lualaba", lat: -10.68, lng: 26.1 },
  LUB: { key: "LUB", name: "Lubumbashi–Kipushi", province: "Haut-Katanga", lat: -11.85, lng: 27.2 },
  WAL: { key: "WAL", name: "Walikale", province: "Nord-Kivu", lat: -1.55, lng: 27.95 },
  KAM: { key: "KAM", name: "Kamituga", province: "Sud-Kivu", lat: -3.1, lng: 28.15 },
};

const SIDE_KM = 0.9217; // côté d'un carré de ~84,95 ha
export function cellSize(lat: number) {
  return { dLat: SIDE_KM / 110.574, dLng: SIDE_KM / (111.32 * Math.cos((lat * Math.PI) / 180)) };
}

/** Rectangle de w×h carrés dont le coin sud-ouest est la cellule (c, r). Anneau fermé [lng, lat]. */
export function rectRing(cl: Cluster, c: number, r: number, w: number, h: number, inset = 0): number[][] {
  const { dLat, dLng } = cellSize(cl.lat);
  const x0 = cl.lng + (c + inset) * dLng, x1 = cl.lng + (c + w - inset) * dLng;
  const y0 = cl.lat + (r + inset) * dLat, y1 = cl.lat + (r + h - inset) * dLat;
  const f = (n: number) => Math.round(n * 1e6) / 1e6;
  return [[f(x0), f(y0)], [f(x1), f(y0)], [f(x1), f(y1)], [f(x0), f(y1)], [f(x0), f(y0)]];
}

const toText = (ring: number[][]) => ring.slice(0, -1).map(([lng, lat]) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`).join("\n");

/** Exemples : une zone libre (Kolwezi) et un polygone à cheval sur un titre attribué + une demande en cours. */
export const DEMO_EXAMPLES = {
  free: toText(rectRing(CLUSTERS.KOL, 0, 7, 3, 2, 0.1)),
  overlap: toText(rectRing(CLUSTERS.KOL, 1, 2, 3, 3, 0)),
};
