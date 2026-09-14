import { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, getCountry, loadStates, statesOfSync } from '@/utils/locations';

/** Country list and lookup. Static data, exposed as a hook for symmetry with useStatesOf. */
export function useLocations() {
  return useMemo(() => ({ countries: COUNTRIES, countryOf: getCountry }), []);
}

/**
 * Subdivisions of one country. Nigeria is answered synchronously; any other
 * country triggers the lazy world dataset, and `loading` is true until it
 * lands so callers can show a placeholder rather than an empty list.
 */
export function useStatesOf(countryCode: string): { states: string[]; loading: boolean } {
  const sync = countryCode ? statesOfSync(countryCode) : [];
  const needsLoad = sync === null;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!needsLoad) return;
    let alive = true;
    loadStates().then(() => {
      if (alive) setTick((t) => t + 1);
    });
    return () => { alive = false; };
  }, [needsLoad]);

  return useMemo(
    () => ({ states: sync ?? [], loading: needsLoad }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync is derived from countryCode + cache
    [countryCode, needsLoad, sync?.length],
  );
}
