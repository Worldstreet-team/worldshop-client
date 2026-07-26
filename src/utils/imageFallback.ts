import type { SyntheticEvent } from 'react';

export const CATEGORY_PLACEHOLDER = '/images/placeholder-category.svg';
export const PRODUCT_PLACEHOLDER = '/images/placeholder-product.png';

/**
 * onError handler for <img>. Category/product images are R2 presigned URLs that
 * can 404 or expire, so a src that looked fine at render time still fails.
 * Swaps in the placeholder once — guarded so a missing placeholder can't loop.
 */
export function imageFallback(placeholder: string) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    img.src = placeholder;
  };
}
