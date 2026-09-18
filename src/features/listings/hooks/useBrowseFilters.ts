import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useBrowseFilters() {
  const [params, setParams] = useSearchParams();

  const categoryId = params.get('categoryId') ?? '';
  const countryFilter = params.get('country') ?? '';
  const stateFilter = params.get('state') ?? '';
  const condition = params.get('condition') ?? '';
  const search = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sort = params.get('sort') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';

  const attrFilters = useMemo(() => {
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key.startsWith('attr.')) out[key.slice(5)] = value;
    });
    return out;
  }, [params]);

      const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  const [priceSeed, setPriceSeed] = useState({ min: minPrice, max: maxPrice });
  if (priceSeed.min !== minPrice || priceSeed.max !== maxPrice) {
    setPriceSeed({ min: minPrice, max: maxPrice });
    setPriceDraft({ min: minPrice, max: maxPrice });
  }

  const setParam = useCallback(
    (updates: Record<string, string | null>, opts: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      if (!opts.keepPage) next.delete('page');
      setParams(next);
    },
    [params, setParams],
  );

  const clearAll = () => setParams(new URLSearchParams());

  const applyPrice = () => {
    setParam({ minPrice: priceDraft.min.trim() || null, maxPrice: priceDraft.max.trim() || null });
  };

  return {
    categoryId,
    countryFilter,
    stateFilter,
    condition,
    search,
    page,
    sort,
    minPrice,
    maxPrice,
    attrFilters,
    setParam,
    clearAll,
    priceDraft,
    setPriceDraft,
    applyPrice,
  };
}

export type BrowseFilters = ReturnType<typeof useBrowseFilters>;
