/* Distance from the buyer's anchor (R-001). Locations are city/area points only, never
   a home address (PLAN F8, K10). */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371.0088;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** `radiusKm` null means nationwide. */
export function withinRadius(anchor: LatLng, point: LatLng, radiusKm: number | null): boolean {
  return radiusKm === null || haversineKm(anchor, point) <= radiusKm;
}
