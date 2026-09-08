import type { Listing } from '@/services/storeService';

/** Listing prices stay in naira; only the subscription is USD. */
export const fmtNaira = (n: number) => '₦' + n.toLocaleString('en-NG');

export type ImageRef = Record<string, unknown> & { key?: string; url?: string };

/** Uploads return a key; some records already carry a resolved URL. */
export const imageSrc = (img: ImageRef): string => String(img.url || img.key || '');

export const firstImage = (l: Pick<Listing, 'images'>): string | null => {
  const imgs = (l.images as ImageRef[]) ?? [];
  return imgs.length ? imageSrc(imgs[0]) : null;
};

/**
 * A listing may have a fixed price, a range, or none at all — "contact for
 * price" is a legitimate choice in a classifieds market, not missing data.
 */
export function priceLabel(l: Pick<Listing, 'priceType' | 'basePrice' | 'maxPrice'>): string {
  if (l.priceType === 'ON_REQUEST') return 'Contact for price';
  if (l.priceType === 'RANGE' && l.basePrice != null && l.maxPrice != null) {
    return `${fmtNaira(l.basePrice)} – ${fmtNaira(l.maxPrice)}`;
  }
  return l.basePrice != null ? fmtNaira(l.basePrice) : 'Contact for price';
}

/** Nigerian numbers are entered locally; wa.me needs them international. */
export function waLink(number: string, message?: string): string {
  const digits = number.replace(/\D/g, '');
  const intl = digits.startsWith('234') ? digits : `234${digits.replace(/^0/, '')}`;
  return message ? `https://wa.me/${intl}?text=${encodeURIComponent(message)}` : `https://wa.me/${intl}`;
}
