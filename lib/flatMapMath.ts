/** Clamp view so map edges don't go past viewport edges */
export function clampView(v: { zoom: number; ox: number; oy: number }, w: number, h: number) {
  const mapW = w * v.zoom;
  const mapH = h * v.zoom;
  v.ox = Math.min(0, Math.max(w - mapW, v.ox));
  v.oy = Math.min(0, Math.max(h - mapH, v.oy));
}

/** Convert lat/lng to canvas pixel coordinates with zoom/pan */
export function latLngToXY(
  lat: number,
  lng: number,
  w: number,
  h: number,
  zoom: number,
  ox: number,
  oy: number,
): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * w * zoom + ox,
    y: ((90 - lat) / 180) * h * zoom + oy,
  };
}

/** Convert screen pixel coordinates back to lat/lng */
export function screenToLatLng(
  sx: number,
  sy: number,
  w: number,
  h: number,
  zoom: number,
  ox: number,
  oy: number,
): { lat: number; lng: number } {
  const baseX = (sx - ox) / zoom;
  const baseY = (sy - oy) / zoom;
  return {
    lng: (baseX / w) * 360 - 180,
    lat: 90 - (baseY / h) * 180,
  };
}

/** Haversine great-circle distance (returns radians) */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
