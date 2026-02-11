export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  stockKeepingUnit: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface DigitalAsset {
  id: string;
  productId: string;
  fileName: string;
  r2Key?: string;
  signedUrl?: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc?: string;
  stockKeepingUnit: string;
  basePrice: number;
  salePrice?: number;
  type: 'PHYSICAL' | 'DIGITAL';
  categoryId: string;
  category?: Category;
  brand?: string;
  tags: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  digitalAssets?: DigitalAsset[];
  avgRating: number;
  reviewCount: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parentId?: string;
  parent?: Category | null;
  children?: Category[];
  productCount?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  rating?: number;
  inStock?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'rating' | 'popular';
  page?: number;
  limit?: number;
}
