import type { LatLng } from "@ws/lib/geo";
import { haversineKm } from "@ws/lib/geo";

/*
 * Areas a buyer can anchor to (R-001). Reference data, not mock data: city and area
 * centroids, never addresses (PLAN F8, K10). Buyers pick an area; the city entries are
 * the IP fallback ("Showing items near Lagos").
 */

/** The buyer's location anchor. `label` is what the location bar shows. */
export type Anchor = LatLng & { id: string; label: string; city: string };

const area = (id: string, label: string, city: string, lat: number, lng: number): Anchor => ({ id, label, city, lat, lng });

export const AREAS: readonly Anchor[] = [
  area("lagos", "Lagos", "Lagos", 6.5244, 3.3792),
  area("ikeja", "Ikeja", "Lagos", 6.6018, 3.3515),
  area("yaba", "Yaba", "Lagos", 6.5095, 3.3711),
  area("surulere", "Surulere", "Lagos", 6.4969, 3.3539),
  area("victoria-island", "Victoria Island", "Lagos", 6.4281, 3.4219),
  area("ikoyi", "Ikoyi", "Lagos", 6.4521, 3.4352),
  area("lekki", "Lekki", "Lagos", 6.4474, 3.4723),
  area("ajah", "Ajah", "Lagos", 6.4672, 3.5717),
  area("festac", "Festac", "Lagos", 6.4664, 3.2836),
  area("ikorodu", "Ikorodu", "Lagos", 6.6194, 3.5105),
  area("abuja", "Abuja", "Abuja", 9.0765, 7.3986),
  area("wuse", "Wuse", "Abuja", 9.0801, 7.4694),
  area("garki", "Garki", "Abuja", 9.0333, 7.4917),
  area("maitama", "Maitama", "Abuja", 9.0882, 7.4934),
  area("ibadan", "Ibadan", "Ibadan", 7.3775, 3.947),
  area("port-harcourt", "Port Harcourt", "Port Harcourt", 4.8156, 7.0498),
  area("kano", "Kano", "Kano", 12.0022, 8.592),
  area("benin-city", "Benin City", "Benin City", 6.335, 5.6037),
  area("enugu", "Enugu", "Enugu", 6.4584, 7.5464),
];

/** Until a real IP lookup exists, every visitor starts in Lagos (R-001, mock). */
export const IP_FALLBACK_AREA = "lagos";

export function findArea(id: string | undefined): Anchor | undefined {
  return AREAS.find((a) => a.id === id);
}

/** The closest named area to a device position ("Use my location", F8). */
export function nearestArea(point: LatLng): Anchor {
  return AREAS.reduce((best, a) => (haversineKm(point, a) < haversineKm(point, best) ? a : best));
}

/** Areas grouped by city, cities in list order, for the selector. */
export function areasByCity() {
  const groups = new Map<string, Anchor[]>();
  for (const a of AREAS) groups.set(a.city, [...(groups.get(a.city) ?? []), a]);
  return [...groups.entries()];
}
