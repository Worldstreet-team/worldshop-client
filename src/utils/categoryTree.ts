import type { Category } from '@/types/product.types';

/**
 * Listings only ever save under a leaf subcategory — ProductEdit hides any
 * parent category that has children from the "file under" picker, since a
 * listing can't be filed directly against one. So browsing "by department"
 * (a parent id, e.g. from a homepage tile) has to be resolved to every one
 * of its subcategory ids and queried across all of them: the backend only
 * matches a single categoryId exactly, and a bare parent id never matches a
 * real listing.
 */
export function resolveCategoryIds(categories: Category[], categoryId: string): string[] {
  const children = categories.filter((c) => c.parentId === categoryId).map((c) => c.id);
  return children.length > 0 ? children : [categoryId];
}
