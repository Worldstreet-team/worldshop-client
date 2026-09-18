export const FIELD_LABELS: Record<string, string> = {
  name: 'Product name',
  description: 'Description',
  categoryId: 'Category',
  category: 'Category',
  priceType: 'Pricing',
  basePrice: 'Price',
  maxPrice: 'Maximum price',
  images: 'Photos',
  condition: 'Condition',
  state: 'State',
  city: 'City',
  tags: 'Tags',
  attributes: 'Product details',
  customFields: 'Additional details',
  variants: 'Variants',
};

export function mapServerFieldPath(path: string): { field: string; label: string } {
  const [head, ...rest] = path.split('.');
  if (head === 'attributes' && rest[0]) return { field: `attr-${rest[0]}`, label: rest[0] };
  if (head === 'variants' && rest[0] !== undefined) {
    return { field: 'variants', label: `Variant ${Number(rest[0]) + 1}` };
  }
  if (head === 'categoryId') return { field: 'category', label: 'Category' };
  return { field: head, label: FIELD_LABELS[head] ?? head };
}

