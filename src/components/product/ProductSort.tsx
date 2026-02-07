import type { SelectOption } from '@/components/common/Select';
import Select from '@/components/common/Select';

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'rating' | 'popularity';

interface ProductSortProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const sortOptions: SelectOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
];

export default function ProductSort({ value, onChange, className = '' }: ProductSortProps) {
  return (
    <div className={`product-sort ${className}`}>
      <label htmlFor="product-sort" className="product-sort-label">
        Sort by:
      </label>
      <Select
        id="product-sort"
        options={sortOptions}
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        size="sm"
        fullWidth={false}
      />
    </div>
  );
}
