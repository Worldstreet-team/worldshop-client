import type { Category } from "@/features/catalog/types";

/**
 * Category counts live on the leaves. Listings attach to a subcategory, never
 * to a department, so every top-level category reports productCount 0 and the
 * only way to know whether a department holds anything is to add up its
 * children.
 */
export function subtreeCount(categories: Category[], id: string): number {
  const own = categories.find((c) => c.id === id)?.productCount ?? 0;
  const children = categories
    .filter((c) => c.parentId === id)
    .reduce((n, c) => n + subtreeCount(categories, c.id), 0);
  return own + children;
}

export type Department = Category & { total: number };

/**
 * Departments that actually hold something, each carrying its subtree total.
 *
 * Empty ones are dropped rather than shown at zero: a category that leads to
 * "nothing listed here yet" costs a tap to discover and teaches buyers that
 * the nav lies. Five of the sixteen are empty today, two of them with no
 * subcategories at all.
 */
export function departmentsWithStock(categories: Category[]): Department[] {
  return categories
    .filter((c) => !c.parentId)
    .map((c) => ({ ...c, total: subtreeCount(categories, c.id) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Children of a department that hold something, biggest first. */
export function childrenWithStock(categories: Category[], parentId: string): Department[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .map((c) => ({ ...c, total: subtreeCount(categories, c.id) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** "1 listing" / "23 listings". Said in one place so the four surfaces agree. */
export function listingCount(n: number): string {
  return `${n.toLocaleString("en-NG")} ${n === 1 ? "listing" : "listings"}`;
}
