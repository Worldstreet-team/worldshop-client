import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Listing, PublicStore } from '@/features/stores/api';
import { isVerifiedTier } from '@/features/stores/model';

/**
 * The category page's filters, ported from the sandbox's /categories/:id.
 *
 * They run over the category's rows on the client rather than as API params,
 * because every option shows how many rows it would leave, and the browse
 * endpoint cannot count seller rating, free delivery or a reduced price. The
 * state still lives in the URL, as it does on Browse, so a filtered category
 * survives a share, a bookmark and the back button.
 */

export type CategoryRow = Listing & { store: PublicStore };

export const PRICE_BANDS = {
  'under-100k': { label: 'Under ₦100k', test: (n: number) => n < 100_000 },
  '100k-500k': { label: '₦100k – ₦500k', test: (n: number) => n >= 100_000 && n < 500_000 },
  'over-500k': { label: '₦500k and up', test: (n: number) => n >= 500_000 },
} as const;
export type PriceBand = keyof typeof PRICE_BANDS;

export const RATINGS = { '4.5': 4.5, '4': 4, '3': 3 } as const;
export type RatingFloor = keyof typeof RATINGS;

export const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New',
  USED: 'Used',
  REFURBISHED: 'Refurbished',
};

export const EXTRAS = [
  ['free', 'Free delivery'],
  ['reduced', 'Reduced price'],
  ['verified', 'Verified sellers only'],
] as const;
export type Extra = (typeof EXTRAS)[number][0];

export const SORTS = [
  { value: '', label: 'Recommended' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'discount', label: 'Biggest discount' },
] as const;

export type CategoryFilterState = {
  price: PriceBand | null;
  rating: RatingFloor | null;
  conditions: string[];
  free: boolean;
  reduced: boolean;
  verified: boolean;
};

const EMPTY: CategoryFilterState = {
  price: null,
  rating: null,
  conditions: [],
  free: false,
  reduced: false,
  verified: false,
};

// "Free delivery" is the delivery label the listing page shows; anything else
// is delivery at a cost, which is not what the filter promises.
const isFree = (r: CategoryRow) => Boolean(r.delivery && /free/i.test(r.delivery.label));
const isReduced = (r: Listing) =>
  r.compareAtPrice != null && r.basePrice != null && r.compareAtPrice > r.basePrice;

/** Share of the was-price taken off; 0 for a listing that is not reduced. */
const discountOf = (r: Listing) =>
  isReduced(r) ? (r.compareAtPrice! - r.basePrice!) / r.compareAtPrice! : 0;

function matches(r: CategoryRow, f: CategoryFilterState): boolean {
  // "Contact for price" has no number to put in a band, so a price filter
  // leaves it out rather than guessing which band it belongs in.
  if (f.price && (r.basePrice == null || !PRICE_BANDS[f.price].test(r.basePrice))) return false;
  if (f.rating && (r.store?.avgRating ?? 0) < RATINGS[f.rating]) return false;
  if (f.conditions.length && !(r.condition && f.conditions.includes(r.condition))) return false;
  if (f.free && !isFree(r)) return false;
  if (f.reduced && !isReduced(r)) return false;
  if (f.verified && !isVerifiedTier(r.store?.verificationTier ?? '')) return false;
  return true;
}

export const applyFilters = (rows: CategoryRow[], f: CategoryFilterState) =>
  rows.filter((r) => matches(r, f));

/** How many rows the filters would leave with `patch` applied on top. */
export const countWith = (
  rows: CategoryRow[],
  f: CategoryFilterState,
  patch: Partial<CategoryFilterState>,
) => applyFilters(rows, { ...f, ...patch }).length;

export const activeCount = (f: CategoryFilterState) =>
  (f.price ? 1 : 0) +
  (f.rating ? 1 : 0) +
  f.conditions.length +
  (f.free ? 1 : 0) +
  (f.reduced ? 1 : 0) +
  (f.verified ? 1 : 0);

export function sortRows<T extends Listing>(rows: T[], sort: string): T[] {
  // Recommended is the order the API returned, newest first.
  if (!sort) return rows;
  const price = (r: T, missing: number) => r.basePrice ?? missing;
  return [...rows].sort((a, b) => {
    if (sort === 'price_asc') return price(a, Infinity) - price(b, Infinity);
    if (sort === 'price_desc') return price(b, -Infinity) - price(a, -Infinity);
    return discountOf(b) - discountOf(a);
  });
}

const flag = (v: string | null) => v === '1';

export function useCategoryFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<CategoryFilterState>(() => {
    const price = params.get('price');
    const rating = params.get('rating');
    return {
      price: price && price in PRICE_BANDS ? (price as PriceBand) : null,
      rating: rating && rating in RATINGS ? (rating as RatingFloor) : null,
      conditions: (params.get('condition') ?? '').split(',').filter(Boolean),
      free: flag(params.get('free')),
      reduced: flag(params.get('reduced')),
      verified: flag(params.get('verified')),
    };
  }, [params]);

  const sort = params.get('sort') ?? '';

  const write = useCallback(
    (next: CategoryFilterState, nextSort = sort) => {
      const out = new URLSearchParams();
      if (next.price) out.set('price', next.price);
      if (next.rating) out.set('rating', next.rating);
      if (next.conditions.length) out.set('condition', next.conditions.join(','));
      if (next.free) out.set('free', '1');
      if (next.reduced) out.set('reduced', '1');
      if (next.verified) out.set('verified', '1');
      if (nextSort) out.set('sort', nextSort);
      setParams(out, { replace: true });
    },
    [setParams, sort],
  );

  return {
    filters,
    sort,
    setFilters: (patch: Partial<CategoryFilterState>) => write({ ...filters, ...patch }),
    setSort: (next: string) => write(filters, next),
    clearAll: () => write(EMPTY),
  };
}

export type CategoryFiltersApi = ReturnType<typeof useCategoryFilters>;
