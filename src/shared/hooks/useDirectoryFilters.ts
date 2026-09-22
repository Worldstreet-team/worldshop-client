import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocations } from '@/shared/hooks/useLocations';

export const DIRECTORY_PAGE_SIZE = 24;

export type DirectoryToken = { key: string; label: string; clear: () => void };

/**
 * Location + page for the store and mall directories, kept in the URL for the
 * same reason Browse keeps its filters there: "stores in Lagos, page 2" has to
 * survive a shared link and the back button.
 */
export function useDirectoryFilters() {
  const [params, setParams] = useSearchParams();
  const { countryOf } = useLocations();

  const country = params.get('country') ?? '';
  const state = params.get('state') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const countryName = country ? (countryOf(country)?.name ?? country) : '';

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      setParams(next);
    },
    [params, setParams],
  );

  const setCountry = (code: string) => update({ country: code, state: null, page: null });
  const setState = (name: string) => update({ state: name, page: null });
  const clearAll = () => setParams(new URLSearchParams());

  const setPage = (next: number) => {
    update({ page: next <= 1 ? null : String(next) });
    window.scrollTo({ top: 0 });
  };

  const tokens: DirectoryToken[] = [];
  if (country) tokens.push({ key: 'country', label: countryName, clear: () => setCountry('') });
  if (state) tokens.push({ key: 'state', label: state, clear: () => setState('') });

  return {
    country,
    state,
    page,
    countryName,
    place: state || countryName,
    tokens,
    query: {
      page,
      limit: DIRECTORY_PAGE_SIZE,
      ...(country ? { country } : {}),
      ...(state ? { state } : {}),
    },
    setCountry,
    setState,
    setPage,
    clearAll,
  };
}

export type DirectoryFilters = ReturnType<typeof useDirectoryFilters>;
