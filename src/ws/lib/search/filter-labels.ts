import type { Category } from "@ws/lib/data/types";
import { formatCurrency } from "@ws/lib/money";
import { MULTI_GROUPS, WITHIN_OPTIONS, filterParams, type FilterKey, type Filters } from "./filters";

/* Words for applied filters: one chip per chosen value (Baymard applied filters), each
   with the URL changes that remove it. */

export type Chip = { key: FilterKey; label: string; remove: Record<string, string | null> };

export function priceLabel(f: Filters) {
  if (f.min !== undefined && f.max !== undefined) return `${formatCurrency(f.min)} – ${formatCurrency(f.max)}`;
  if (f.min !== undefined) return `From ${formatCurrency(f.min)}`;
  return `Up to ${formatCurrency(f.max!)}`;
}

export function filterChips(f: Filters, categories: readonly Pick<Category, "id" | "name">[]): Chip[] {
  const chips: Chip[] = [];
  if (f.cat) chips.push({ key: "cat", label: categories.find((c) => c.id === f.cat)?.name ?? f.cat, remove: { cat: null } });
  if (f.min !== undefined || f.max !== undefined) chips.push({ key: "price", label: priceLabel(f), remove: { min: null, max: null } });
  for (const g of MULTI_GROUPS) {
    const values = f[g.key] ?? [];
    for (const v of values) {
      const rest = values.filter((x) => x !== v);
      chips.push({ key: g.key, label: g.options.find((o) => o.value === v)?.label ?? v, remove: { [g.key]: rest.length ? rest.join(",") : null } });
    }
  }
  if (f.within !== undefined) chips.push({ key: "within", label: `Listed in the ${WITHIN_OPTIONS.find((o) => o.value === f.within)!.label.toLowerCase()}`, remove: { within: null } });
  return chips;
}

/** "Remove condition", "Remove price": a whole group, for ZeroResults. */
export function groupName(key: FilterKey, f: Filters, categories: readonly Pick<Category, "id" | "name">[]) {
  if (key === "cat") return categories.find((c) => c.id === f.cat)?.name ?? "category";
  if (key === "price") return "price";
  if (key === "within") return "date listed";
  return MULTI_GROUPS.find((g) => g.key === key)!.label.toLowerCase();
}

/** URL changes that remove a whole group. */
export const removeGroup = (key: FilterKey) => Object.fromEntries(filterParams(key).map((p) => [p, null]));

/** URL changes that clear every filter. */
export const clearAll = () => Object.fromEntries((["cat", "price", ...MULTI_GROUPS.map((g) => g.key), "within"] as FilterKey[]).flatMap(filterParams).map((p) => [p, null]));
