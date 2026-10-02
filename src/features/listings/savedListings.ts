import type { Listing } from '@/features/stores/api';
import { Bookmark } from 'lucide-react';
import { useUIStore } from '@/shared/store/uiStore';


export type SavedListing = Pick<
  Listing,
  'id' | 'slug' | 'name' | 'condition' | 'city' | 'state' | 'images' | 'priceType' | 'basePrice' | 'maxPrice'
> &
  Partial<Pick<Listing, 'category' | 'isNegotiable'>> & { savedAt: number };

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
      const { id, slug, name, condition, city, state, images, priceType, basePrice, maxPrice, category, isNegotiable } = listing;
      write([
        { id, slug, name, condition, city, state, images, priceType, basePrice, maxPrice, category, isNegotiable, savedAt: Date.now() },
        ...current,
      ]);
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

const SAVED_MSG = 'Added to Saved';
const REMOVED_MSG = 'Removed from Saved';

/** What the save buttons call: toggles, then confirms with a short toast. */
export function toggleSaved(listing: Omit<SavedListing, 'savedAt'>) {
  const nowSaved = savedListings.toggle(listing);
  // Tapping a heart on and off would otherwise stack "Saved" over "Removed";
  // only the latest state is worth showing.
  const ui = useUIStore.getState();
  ui.toasts
    .filter((t) => t.message === SAVED_MSG || t.message === REMOVED_MSG)
    .forEach((t) => ui.removeToast(t.id));
  if (nowSaved) {
    ui.addToast({ type: 'success', message: SAVED_MSG, description: 'Find it any time under Saved items.', duration: 3000 });
  } else {
    ui.addToast({ type: 'info', message: REMOVED_MSG, icon: Bookmark, duration: 3000 });
  }
}
