export type ListingFilters = Record<string, unknown>;

export const queryKeys = {
  categories: () => ['categories'] as const,
  categoryAttributes: (categoryId: string) => ['categories', categoryId, 'attributes'] as const,

  listings: (filters: ListingFilters) => ['listings', filters] as const,
  listingsByCategories: (categoryIds: string[], filters: ListingFilters) =>
    ['listings', 'fanout', categoryIds, filters] as const,
  listing: (idOrSlug: string) => ['listing', idOrSlug] as const,
  listingSuggestions: (search: string) => ['listings', 'suggest', search] as const,

  stores: (filters: ListingFilters) => ['stores', filters] as const,
  store: (slug: string) => ['store', slug] as const,
  storeListings: (slug: string, params: ListingFilters) => ['store', slug, 'listings', params] as const,
  storeCatalogue: (slug: string) => ['store', slug, 'catalogue'] as const,
  storeReviews: (slug: string, params: ListingFilters) => ['store', slug, 'reviews', params] as const,

  malls: (filters: ListingFilters) => ['malls', filters] as const,
  mall: (slug: string) => ['mall', slug] as const,

  listingReviews: (listingId: string) => ['reviews', 'listing', listingId] as const,
  listingReviewPage: (listingId: string, params: ListingFilters) =>
    ['reviews', 'listing', listingId, 'page', params] as const,
  listingReviewEligibility: (listingId: string) => ['reviews', 'listing', listingId, 'eligibility'] as const,
  myListingReview: (listingId: string) => ['reviews', 'listing', listingId, 'mine'] as const,

  unreadCount: () => ['chat', 'unread'] as const,
  wallet: () => ['wallet'] as const,
} as const;
