/** GeoJSON Polygon / MultiPolygon in WGS84 [lng, lat], as stored for a ward. */
export interface WardGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
}

export interface ProjectedShape {
  /** SVG path data in a 0..width / 0..height box. */
  d: string;
  /** A point inside the shape's bounding box centre of its biggest ring, for a label. */
  label: [number, number];
}

type Ring = [number, number][];

function polygonsOf(g: WardGeometry): Ring[][] {
  const c = g.coordinates as unknown;
  if (g.type === "Polygon") return [c as Ring[]];
  if (g.type === "MultiPolygon") return c as Ring[][];
  return [];
}

/**
 * Projects ward shapes into one SVG box (equirectangular, corrected for latitude) so that
 * neighbouring wards keep their shared borders. Returns null when no shape has coordinates.
 */
export function projectGeometries(geoms: (WardGeometry | undefined)[], width: number, height: number, pad = 8): { shapes: (ProjectedShape | null)[]; aspect: number } | null {
  const all = geoms.flatMap((g) => (g ? polygonsOf(g).flat(2) : []));
  const pts = all.filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (pts.length === 0) return null;
  const minLng = Math.min(...pts.map((p) => p[0]));
  const maxLng = Math.max(...pts.map((p) => p[0]));
  const minLat = Math.min(...pts.map((p) => p[1]));
  const maxLat = Math.max(...pts.map((p) => p[1]));
  const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const w = Math.max((maxLng - minLng) * k, 1e-9);
  const h = Math.max(maxLat - minLat, 1e-9);
  const scale = Math.min((width - pad * 2) / w, (height - pad * 2) / h);
  const ox = (width - w * scale) / 2;
  const oy = (height - h * scale) / 2;
  const pt = ([lng, lat]: [number, number]): [number, number] => [ox + (lng - minLng) * k * scale, oy + (maxLat - lat) * scale];
  const shapes = geoms.map((g) => {
    if (!g) return null;
    const polys = polygonsOf(g);
    if (polys.length === 0) return null;
    let d = "";
    let best: Ring | null = null;
    let bestSpan = -1;
    for (const poly of polys) {
      for (const ring of poly) {
        if (!Array.isArray(ring) || ring.length < 3) continue;
        d += ring.map((p, i) => `${i === 0 ? "M" : "L"}${pt(p).map((n) => n.toFixed(1)).join(" ")}`).join("") + "Z";
        const lngs = ring.map((p) => p[0]);
        const span = Math.max(...lngs) - Math.min(...lngs);
        if (span > bestSpan) {
          bestSpan = span;
          best = ring;
        }
      }
    }
    if (!d || !best) return null;
    const bl = best.map((p) => p[0]);
    const bt = best.map((p) => p[1]);
    const label = pt([(Math.min(...bl) + Math.max(...bl)) / 2, (Math.min(...bt) + Math.max(...bt)) / 2]);
    return { d, label };
  });
  return { shapes, aspect: width / height };
}
