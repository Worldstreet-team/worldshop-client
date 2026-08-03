import type { Listing } from '@/services/storeService';

/**
 * Local-only saved listings. There is no backend for saves, so each heart
 * stores a snapshot of the fields a card needs — that is what lets /saved
 * render without a fetch-by-id endpoint. The trade-off is staleness: a saved
 * card shows the price at save time until the visitor reopens the listing.
 *
 * Reads go through a cache so `useSyncExternalStore` gets a stable reference;
 * every write bumps the cache and notifies subscribers (and other tabs via
 * the native `storage` event). A failed read degrades to "nothing saved".
 */

export type SavedListing = Pick<
  Listing,
  'id' | 'slug' | 'name' | 'condition' | 'city' | 'state' | 'images' | 'priceType' | 'basePrice' | 'maxPrice'
> & { savedAt: number };

const KEY = 'ws:saved';

let cache: SavedListing[] | null = null;
const listeners = new Set<() => void>();

function read(): SavedListing[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter((x): x is SavedListing => !!x && typeof x === 'object' && 'id' in x)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: SavedListing[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): saves last for this tab only.
  }
  listeners.forEach((l) => l());
}

// Another tab toggled a heart — drop the cache so the next read re-parses.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    cache = null;
    listeners.forEach((l) => l());
  }
});

export const savedListings = {
  has(id: string): boolean {
    return read().some((s) => s.id === id);
  },

  /** Newest save first. */
  all(): SavedListing[] {
    return read();
  },

  count(): number {
    return read().length;
  },

  toggle(listing: Omit<SavedListing, 'savedAt'>): boolean {
    const current = read();
    const nowSaved = !current.some((s) => s.id === listing.id);
    if (nowSaved) {
      const { id, slug, name, condition, city, state, images, priceType, basePrice, maxPrice } = listing;
      write([{ id, slug, name, condition, city, state, images, priceType, basePrice, maxPrice, savedAt: Date.now() }, ...current]);
    } else {
      write(current.filter((s) => s.id !== listing.id));
    }
    return nowSaved;
  },

  remove(id: string) {
    write(read().filter((s) => s.id !== id));
  },

  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};
