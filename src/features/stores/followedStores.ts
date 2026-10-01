import { useSyncExternalStore } from 'react';

/**
 * Stores the buyer follows, kept in this browser.
 *
 * The API has no follow endpoint, so this is local in the same way saved
 * listings are: it survives a reload and follows the buyer across tabs, but
 * not to another device, and the seller is not told.
 */

const KEY = 'ws:following';

let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): the follow lasts for this tab.
  }
  listeners.forEach((l) => l());
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    cache = null;
    listeners.forEach((l) => l());
  }
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useFollowing(storeId: string) {
  const following = useSyncExternalStore(subscribe, () => read().includes(storeId));
  const toggle = () => {
    const now = read();
    write(following ? now.filter((id) => id !== storeId) : [storeId, ...now]);
    return !following;
  };
  return { following, toggle };
}
