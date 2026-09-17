import { useEffect, useState } from 'react';
import { publicMarketplace, type Listing, type PublicStore } from '@/features/stores/api';

export function useSearchSuggestions(searchBox: string, mobileSearchOpen: boolean) {
  const [suggestions, setSuggestions] = useState<Array<Listing & { store: PublicStore }>>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  useEffect(() => {
    const q = searchBox.trim();
    if (!mobileSearchOpen || q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setSuggestLoading(true);
      publicMarketplace.browse({ search: q, limit: 5 })
        .then((res) => { if (!cancelled) setSuggestions(res.data); })
        .catch(() => { if (!cancelled) setSuggestions([]); })
        .finally(() => { if (!cancelled) setSuggestLoading(false); });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchBox, mobileSearchOpen]);

  return { suggestions, suggestLoading };
}
