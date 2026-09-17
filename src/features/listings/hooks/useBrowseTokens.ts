import { useMemo } from 'react';
import type { Category } from '@/features/catalog/types';
import type { BrowseFilters } from './useBrowseFilters';

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function useBrowseTokens(
  filters: BrowseFilters,
  selected: Category | undefined,
  countryName: string,
) {
  const { search, countryFilter, stateFilter, condition, minPrice, maxPrice, attrFilters, setParam } = filters;

  const activeTokens = useMemo(() => {
    const out: Array<{ key: string; label: string; clear: () => void }> = [];
    if (search) out.push({ key: 'search', label: `“${search}”`, clear: () => setParam({ search: null }) });
    if (selected) out.push({ key: 'cat', label: selected.name, clear: () => setParam({ categoryId: null }) });
    if (countryFilter) out.push({ key: 'country', label: countryName, clear: () => setParam({ country: null, state: null }) });
    if (stateFilter) out.push({ key: 'state', label: stateFilter, clear: () => setParam({ state: null }) });
    if (condition) out.push({ key: 'cond', label: titleCase(condition), clear: () => setParam({ condition: null }) });
    if (minPrice || maxPrice) {
      const fmt = (v: string) => `₦${Number(v).toLocaleString('en-NG')}`;
      const label =
        minPrice && maxPrice ? `${fmt(minPrice)} – ${fmt(maxPrice)}`
        : minPrice ? `From ${fmt(minPrice)}`
        : `Under ${fmt(maxPrice)}`;
      out.push({ key: 'price', label, clear: () => setParam({ minPrice: null, maxPrice: null }) });
    }
    for (const [name, value] of Object.entries(attrFilters)) {
      out.push({ key: `attr.${name}`, label: `${name}: ${value}`, clear: () => setParam({ [`attr.${name}`]: null }) });
    }
    return out;
  }, [search, selected, countryFilter, countryName, stateFilter, condition, minPrice, maxPrice, attrFilters, setParam]);

  return activeTokens;
}
