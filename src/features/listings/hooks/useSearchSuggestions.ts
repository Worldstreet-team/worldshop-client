import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicMarketplace } from '@/features/stores/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

export function useSearchSuggestions(searchBox: string, mobileSearchOpen: boolean) {
  const [term, setTerm] = useState('');

  useEffect(() => {
    const q = searchBox.trim();
    if (!mobileSearchOpen || q.length < MIN_CHARS) return;
    const t = setTimeout(() => setTerm(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchBox, mobileSearchOpen]);

  const active = mobileSearchOpen && term.length >= MIN_CHARS && term === searchBox.trim();

  const query = useQuery({
    queryKey: queryKeys.listingSuggestions(term),
    queryFn: () => publicMarketplace.browse({ search: term, limit: 5 }).then((res) => res.data),
    enabled: active,
    staleTime: 5 * MINUTE,
  });

  const pendingInput =
    mobileSearchOpen && searchBox.trim().length >= MIN_CHARS && searchBox.trim() !== term;

  return {
    suggestions: active && query.data ? query.data : [],
    suggestLoading: pendingInput || (active && query.isFetching),
  };
}
