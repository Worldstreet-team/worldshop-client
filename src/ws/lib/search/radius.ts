import { rules } from "@ws/config/marketplace-rules";
import type { Listing } from "@ws/lib/data/types";
import { haversineKm, type LatLng } from "@ws/lib/geo";

/*
 * Location radius (R-001, R-016, flows B2): never show an item outside the radius
 * unless the buyer chose Nationwide. `null` is Nationwide; in the URL it's "all".
 */

export type Radius = (typeof rules.location.radiiKm)[number] | null;

export const RADII: readonly Radius[] = [...rules.location.radiiKm, null];

export function parseRadius(value: string | string[] | undefined): Radius {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "all") return null;
  const n = Number(v);
  return (rules.location.radiiKm as readonly number[]).includes(n) ? (n as Radius) : rules.location.defaultRadiusKm;
}

export function radiusParam(radius: Radius) {
  return radius === null ? "all" : String(radius);
}

export function radiusLabel(radius: Radius) {
  return radius === null ? "Nationwide" : `${radius} km`;
}

export function filterByRadius<T extends Pick<Listing, "location">>(listings: readonly T[], anchor: LatLng, radius: Radius): T[] {
  if (radius === null) return [...listings];
  return listings.filter((l) => haversineKm(anchor, l.location) <= radius);
}

/** How many listings each radius would show, for "12 results within 25 km" (B2). */
export function countsByRadius(listings: readonly Pick<Listing, "location">[], anchor: LatLng): Map<Radius, number> {
  const km = listings.map((l) => haversineKm(anchor, l.location));
  return new Map(RADII.map((r) => [r, r === null ? km.length : km.filter((d) => d <= r).length]));
}

/**
 * The next radius out that would show more than `current` results, or undefined.
 * Shared by ZeroResults and the end-of-list nudge (NN/g scoped search).
 */
export function widerRadius(radius: Radius, counts: ReadonlyMap<Radius, number>, current: number): Radius | undefined {
  if (radius === null) return undefined;
  return RADII.filter((r) => r === null || r > radius).find((r) => (counts.get(r) ?? 0) > current);
}
