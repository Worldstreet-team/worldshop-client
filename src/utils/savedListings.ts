/**
 * Local-only saved listings. The spec keeps hearts optimistic/local until a
 * backend exists, so this is a plain localStorage set — no store, no events.
 * A failed read (private mode, quota) degrades to "nothing saved".
 */
const KEY = 'ws:saved-listings';

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export const savedListings = {
  has(id: string): boolean {
    return read().has(id);
  },
  toggle(id: string): boolean {
    const set = read();
    const nowSaved = !set.has(id);
    if (nowSaved) set.add(id);
    else set.delete(id);
    try {
      localStorage.setItem(KEY, JSON.stringify([...set]));
    } catch {
      // Storage unavailable: the heart still toggles for this render.
    }
    return nowSaved;
  },
};
