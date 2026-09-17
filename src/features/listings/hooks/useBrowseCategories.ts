import { useEffect, useMemo, useState } from 'react';
import { categoryService } from '@/features/catalog/api';
import type { Category, CategoryAttribute } from '@/features/catalog/types';

export function useBrowseCategories(categoryId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [facetSource, setFacetSource] = useState<{ categoryId: string; attributes: CategoryAttribute[] }>({
    categoryId: '',
    attributes: [],
  });

  const parents = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

  const selected = categories.find((c) => c.id === categoryId);
    const openParentId = selected ? (selected.parentId ?? selected.id) : '';
  const siblings = useMemo(
    () => categories.filter((c) => c.parentId === openParentId),
    [categories, openParentId],
  );
  const isLeaf = Boolean(selected?.parentId);

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => undefined);
  }, []);

    const facets = facetSource.categoryId === categoryId ? facetSource.attributes : [];

  useEffect(() => {
    if (!categoryId || !isLeaf) return;
    let cancelled = false;

    categoryService
      .getCategoryAttributes(categoryId)
      .then((attrs) => {
        if (cancelled) return;
        setFacetSource({
          categoryId,
          attributes: attrs.filter((a) => a.isFilterable && a.type === 'SELECT'),
        });
      })
      .catch(() => {
        if (!cancelled) setFacetSource({ categoryId, attributes: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, isLeaf]);

  return { categories, parents, selected, openParentId, siblings, isLeaf, facets };
}
