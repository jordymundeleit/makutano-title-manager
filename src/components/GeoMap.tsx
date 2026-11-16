"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { CircleMarker, GeoJSON, LayersControl, MapContainer, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Feature, Geometry } from "geojson";
import { STATUS_COLOR, type TitleStatus } from "@/lib/constants";
import type { LatLng } from "@/lib/coords";
import type { TitleCollection } from "@/lib/types";

export type FlyTarget = { lat: number; lng: number; zoom: number; nonce: number };

type Props = {
  data?: TitleCollection | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  draft?: LatLng[];
  conflicts?: Geometry[];
  focus?: Geometry | null;
  onMapClick?: (lat: number, lng: number) => void;
  flyTo?: FlyTarget | null;
};

function Controller({ flyTo, focus }: { flyTo?: FlyTarget | null; focus?: Geometry | null }) {
  const map = useMap();
  const focusKey = focus ? JSON.stringify(focus) : "";
  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom, { duration: 1.2 });
  }, [flyTo, map]);
  useEffect(() => {
    if (!focusKey) return;
    const b = L.geoJSON(JSON.parse(focusKey)).getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.5), { maxZoom: 13 });
  }, [focusKey, map]);
  return null;
}

function Clicks({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function GeoMap({ data, selectedId, onSelect, draft, conflicts, focus, onMapClick, flyTo }: Props) {
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const dataKey = useMemo(() => `${data?.features.map((f) => f.properties.id + f.properties.status).join("|") ?? ""}-${selectedId ?? ""}-${onMapClick ? "d" : "v"}`, [data, selectedId, onMapClick]);
  const conflictKey = useMemo(() => JSON.stringify(conflicts ?? []).length + "-" + (conflicts?.length ?? 0), [conflicts]);

  const style = (f?: Feature<Geometry, { id: string; status: TitleStatus }>) => {
    const s = f?.properties.status ?? "FREE";
    const c = STATUS_COLOR[s];
    const sel = f?.properties.id === selectedId;
    return { color: sel ? "#FFFFFF" : c.stroke, weight: sel ? 3 : 1.5, fillColor: c.fill, fillOpacity: s === "FREE" ? 0.28 : 0.5, dashArray: s === "PENDING" ? "5 4" : undefined };
  };

  return (
    <MapContainer center={[-10.2, 26.2]} zoom={6} minZoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <LayersControl position="topright">
  <LayersControl.BaseLayer checked name="Satellite + Noms (Hybride)">
    <>
      <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      />
    </>
  </LayersControl.BaseLayer>
  <LayersControl.BaseLayer name="Carte Routière & Provinces">
    <TileLayer
      attribution="&copy; OpenStreetMap"
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  </LayersControl.BaseLayer>
</LayersControl>

{/* Repères des principaux bassins miniers RDC */}
{[
  { name: "LUALABA — Kolwezi (Cuivre / Cobalt)", coords: [-10.7148, 25.4667] as [number, number] },
  { name: "LUALABA — Tenke Fungurume", coords: [-10.6167, 26.1333] as [number, number] },
  { name: "HAUT-KATANGA — Lubumbashi / Kipushi", coords: [-11.6609, 27.4794] as [number, number] },
  { name: "HAUT-KATANGA — Likasi", coords: [-10.9833, 26.7333] as [number, number] },
  { name: "TANGANYIKA — Manono (Lithium)", coords: [-7.3000, 27.4167] as [number, number] },
  { name: "NORD-KIVU — Rubaya / Walikale (Coltan / Cassitérite)", coords: [-1.5167, 28.8833] as [number, number] },
  { name: "SUD-KIVU — Kamituga / Twangiza (Or)", coords: [-3.0667, 28.1833] as [number, number] },
  { name: "HAUT-UELE — Kibali / Durba (Or)", coords: [3.1167, 29.5833] as [number, number] },
].map((zone) => (
  <CircleMarker
    key={zone.name}
    center={zone.coords}
    radius={4}
    pathOptions={{ color: "#F59E0B", fillColor: "#E53935", fillOpacity: 0.9 }}
  >
    <Tooltip permanent direction="top" offset={[0, -5]}>
      <span style={{ fontSize: "10px", fontWeight: "bold", color: "#121212" }}>
        {zone.name}
      </span>
    </Tooltip>
  </CircleMarker>
))}

      {data && data.features.length > 0 && (
        <GeoJSON
          key={dataKey}
          data={data as never}
          interactive={!onMapClick}
          style={style as never}
          onEachFeature={(f, layer) => {
            const p = (f as Feature<Geometry, { id: string; code: string }>).properties;
            layer.bindTooltip(p.code, { sticky: true });
            layer.on("click", () => selectRef.current?.(p.id));
          }}
        />
      )}

      {conflicts && conflicts.length > 0 && (
        <GeoJSON key={`c-${conflictKey}`} data={{ type: "GeometryCollection", geometries: conflicts } as never} interactive={false} style={{ color: "#FFFFFF", weight: 2, fillColor: "#E53935", fillOpacity: 0.85 }} />
      )}

      {draft && draft.length >= 3 && <Polygon positions={draft} pathOptions={{ color: "#29B6F6", weight: 2.5, dashArray: "6 4", fillColor: "#29B6F6", fillOpacity: 0.2 }} interactive={false} />}
      {draft?.map((p, i) => <CircleMarker key={i} center={p} radius={4} pathOptions={{ color: "#fff", weight: 1.5, fillColor: "#29B6F6", fillOpacity: 1 }} interactive={false} />)}

      <Controller flyTo={flyTo} focus={focus} />
      {onMapClick && <Clicks onMapClick={onMapClick} />}
    </MapContainer>
  );
}
