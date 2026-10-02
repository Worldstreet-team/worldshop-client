import { useEffect, useState } from 'react';
import { writeLocal } from '@/shared/utils/storage';

/**
 * The buyer's state, for the header's location control. Display only: it
 * says where you are and does not filter anything yet.
 *
 * The browser's coordinates are matched to the nearest state capital here, on
 * the device, rather than sent to a reverse-geocoding service: a third party
 * would learn where every visitor is just to print one word. Nearest capital
 * is a guess near a border, which is fine for a label.
 */

// State capitals, [lat, lng]. FCT is labelled Abuja, as people say it.
const CAPITALS: Array<[string, number, number]> = [
  ['Abia', 5.525, 7.4943], ['Adamawa', 9.2035, 12.4954], ['Akwa Ibom', 5.0377, 7.9128],
  ['Anambra', 6.21, 7.07], ['Bauchi', 10.3103, 9.8439], ['Bayelsa', 4.9267, 6.2676],
  ['Benue', 7.7337, 8.5214], ['Borno', 11.8333, 13.15], ['Cross River', 4.9757, 8.3417],
  ['Delta', 6.198, 6.7319], ['Ebonyi', 6.3249, 8.1137], ['Edo', 6.335, 5.6037],
  ['Ekiti', 7.6211, 5.2214], ['Enugu', 6.4584, 7.5464], ['Abuja', 9.0765, 7.3986],
  ['Gombe', 10.2897, 11.1673], ['Imo', 5.4836, 7.0333], ['Jigawa', 11.7562, 9.3389],
  ['Kaduna', 10.5105, 7.4165], ['Kano', 12.0022, 8.592], ['Katsina', 12.9908, 7.6018],
  ['Kebbi', 12.4539, 4.1975], ['Kogi', 7.8023, 6.7333], ['Kwara', 8.4966, 4.5421],
  ['Lagos', 6.6018, 3.3515], ['Nasarawa', 8.4939, 8.5153], ['Niger', 9.6139, 6.5569],
  ['Ogun', 7.1475, 3.3619], ['Ondo', 7.2571, 5.2058], ['Osun', 7.7827, 4.5418],
  ['Oyo', 7.3775, 3.947], ['Plateau', 9.8965, 8.8583], ['Rivers', 4.8156, 7.0498],
  ['Sokoto', 13.0059, 5.2476], ['Taraba', 8.8937, 11.3596], ['Yobe', 11.747, 11.9609],
  ['Zamfara', 12.1704, 6.6641],
];

// Further than this from every capital is outside Nigeria; no label then.
const MAX_KM = 250;
const KEY = 'ws:place';

function remembered(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function nearestState(lat: number, lng: number): string | null {
  let best: string | null = null;
  let bestKm = Infinity;
  for (const [name, cLat, cLng] of CAPITALS) {
    const km = distanceKm(lat, lng, cLat, cLng);
    if (km < bestKm) {
      bestKm = km;
      best = name;
    }
  }
  return bestKm <= MAX_KM ? best : null;
}

/** The detected state, or null until (or unless) the browser allows it. */
export function useCurrentPlace(): string | null {
  // Remembered so the label is right on the next visit before the browser
  // answers again.
  const [place, setPlace] = useState<string | null>(remembered);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const found = nearestState(coords.latitude, coords.longitude);
        setPlace(found);
        writeLocal(KEY, found ?? '');
      },
      // Declined or unavailable: keep whatever was last known.
      () => {},
      { enableHighAccuracy: false, maximumAge: 30 * 60 * 1000, timeout: 10_000 },
    );
  }, []);

  return place || null;
}
