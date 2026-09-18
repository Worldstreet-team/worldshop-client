import { useQuery } from '@tanstack/react-query';
import { publicMarketplace, type Listing, type PublicStore } from '@/features/stores/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

type Row = Listing & { store: PublicStore };

const NO_ROWS: Row[] = [];
const SIMILAR_LIMIT = 5;
const SIMILAR_SHOWN = 4;

export function useListingDetail(idOrSlug: string | undefined) {
  const listingQuery = useQuery({
    queryKey: queryKeys.listing(idOrSlug ?? ''),
    queryFn: () => publicMarketplace.getListing(idOrSlug as string).then((res) => res.data),
    enabled: Boolean(idOrSlug),
    staleTime: 2 * MINUTE,
  });

  const listing = listingQuery.data ?? null;
  const categoryId = listing?.category?.id ?? '';
  const listingId = listing?.id ?? '';

  const similarQuery = useQuery({
    queryKey: queryKeys.listings({ categoryId, limit: SIMILAR_LIMIT }),
    queryFn: () =>
      publicMarketplace.browse({ categoryId, limit: SIMILAR_LIMIT }).then((res) => res.data),
    enabled: Boolean(categoryId),
    staleTime: 5 * MINUTE,
    select: (rows: Row[]) => rows.filter((l) => l.id !== listingId).slice(0, SIMILAR_SHOWN),
  });

  return {
    listing,
    loading: listingQuery.isPending,
    notFound: listingQuery.isError,
    similar: similarQuery.data ?? NO_ROWS,
  };
}
