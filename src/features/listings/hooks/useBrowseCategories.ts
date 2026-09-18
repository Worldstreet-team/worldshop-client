import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/features/catalog/api';
import { useCategories } from '@/features/catalog/hooks/useCategories';
import type { CategoryAttribute } from '@/features/catalog/types';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const NO_FACETS: CategoryAttribute[] = [];

export function useBrowseCategories(categoryId: string) {
  const { categories } = useCategories();

  const parents = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  const selected = categories.find((c) => c.id === categoryId);
  const openParentId = selected ? (selected.parentId ?? selected.id) : '';
  const siblings = useMemo(
    () => categories.filter((c) => c.parentId === openParentId),
    [categories, openParentId],
  );
  const isLeaf = Boolean(selected?.parentId);

  const facetQuery = useQuery({
    queryKey: queryKeys.categoryAttributes(categoryId),
    queryFn: () => categoryService.getCategoryAttributes(categoryId),
    enabled: Boolean(categoryId) && isLeaf,
    staleTime: 30 * MINUTE,
    select: (attrs: CategoryAttribute[]) => attrs.filter((a) => a.isFilterable && a.type === 'SELECT'),
  });

  return {
    categories,
    parents,
    selected,
    openParentId,
    siblings,
    isLeaf,
    facets: facetQuery.data ?? NO_FACETS,
  };
}
