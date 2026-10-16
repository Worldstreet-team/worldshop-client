import { AREAS } from "@ws/lib/areas";
import type { LatLng } from "@ws/lib/geo";

/*
 * Where a listing or shop is, from the city and state the API gives as text. The
 * WorldStore UI measures distance between points, so each place gets a centroid:
 * the named area when the city is one the location picker knows ("Ikeja", "Lekki"),
 * else the state's capital. That is the same precision the reference works at (area
 * centroids, never an address); only the fallback is coarser.
 *
 * Reference data: approximate capital coordinates, one per state and the FCT.
 */

const STATE_CENTROIDS: Record<string, LatLng> = {
  abia: { lat: 5.5249, lng: 7.4942 },
  adamawa: { lat: 9.2035, lng: 12.4954 },
  "akwa ibom": { lat: 5.0377, lng: 7.9128 },
  anambra: { lat: 6.2104, lng: 7.0727 },
  bauchi: { lat: 10.3158, lng: 9.8442 },
  bayelsa: { lat: 4.9267, lng: 6.2676 },
  benue: { lat: 7.7337, lng: 8.5214 },
  borno: { lat: 11.8333, lng: 13.15 },
  "cross river": { lat: 4.9757, lng: 8.3417 },
  delta: { lat: 6.198, lng: 6.7319 },
  ebonyi: { lat: 6.3249, lng: 8.1137 },
  edo: { lat: 6.335, lng: 5.6037 },
  ekiti: { lat: 7.6211, lng: 5.2214 },
  enugu: { lat: 6.4584, lng: 7.5464 },
  fct: { lat: 9.0765, lng: 7.3986 },
  gombe: { lat: 10.2897, lng: 11.1673 },
  imo: { lat: 5.4836, lng: 7.0333 },
  jigawa: { lat: 11.7562, lng: 9.3388 },
  kaduna: { lat: 10.5105, lng: 7.4165 },
  kano: { lat: 12.0022, lng: 8.592 },
  katsina: { lat: 12.9908, lng: 7.6018 },
  kebbi: { lat: 12.4539, lng: 4.1975 },
  kogi: { lat: 7.8023, lng: 6.7333 },
  kwara: { lat: 8.4966, lng: 4.5421 },
  lagos: { lat: 6.5244, lng: 3.3792 },
  nasarawa: { lat: 8.4939, lng: 8.5157 },
  niger: { lat: 9.6139, lng: 6.5569 },
  ogun: { lat: 7.1475, lng: 3.3619 },
  ondo: { lat: 7.2508, lng: 5.2103 },
  osun: { lat: 7.7827, lng: 4.5418 },
  oyo: { lat: 7.3775, lng: 3.947 },
  plateau: { lat: 9.8965, lng: 8.8583 },
  rivers: { lat: 4.8156, lng: 7.0498 },
  sokoto: { lat: 13.0059, lng: 5.2476 },
  taraba: { lat: 8.8937, lng: 11.3596 },
  yobe: { lat: 11.747, lng: 11.9608 },
  zamfara: { lat: 12.1704, lng: 6.6641 },
};

const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** The states the API spells differently from the table ("FCT - Abuja", "Abuja"). */
function stateKey(state: string): string {
  const s = state.toLowerCase().trim();
  if (s.startsWith("fct") || s.includes("abuja")) return "fct";
  return s.replace(/\s+state$/, "");
}

export type Located = LatLng & { area: string; city: string; state: string; known: boolean };

/**
 * A place for display and distance. `known` is false when neither the city nor the
 * state could be placed; the UI then leaves the distance out rather than measure from
 * a guess.
 */
export function locate(city: string | null | undefined, state: string | null | undefined): Located {
  const cleanState = state && state.toLowerCase() !== "unspecified" ? state.trim() : "";
  const cleanCity = city?.trim() ?? "";
  const named = cleanCity ? AREAS.find((a) => key(a.label) === key(cleanCity) || key(a.id) === key(cleanCity)) : undefined;
  if (named) return { lat: named.lat, lng: named.lng, area: named.label, city: named.city, state: cleanState || named.city, known: true };

  const centroid = cleanState ? STATE_CENTROIDS[stateKey(cleanState)] : undefined;
  const label = cleanCity || cleanState || "Nigeria";
  if (centroid) return { ...centroid, area: label, city: cleanCity || cleanState, state: cleanState, known: true };
  // Nowhere to put it: the middle of the country, flagged so no distance is printed.
  return { lat: 9.082, lng: 8.6753, area: label, city: label, state: cleanState, known: false };
}
