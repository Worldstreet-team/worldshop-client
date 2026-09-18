import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/features/catalog/api';
import type { Category } from '@/features/catalog/types';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const EMPTY: Category[] = [];

export function useCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
    staleTime: 30 * MINUTE,
    gcTime: 60 * MINUTE,
  });

  return {
    categories: query.data ?? EMPTY,
    isLoading: query.isPending,
    error: query.error,
  };
}
