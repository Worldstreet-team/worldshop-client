import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { mallService } from '@/features/malls/api';
import { type Listing } from '@/features/stores/api';
import { firstImage, priceLabel } from '@/features/listings/model';
import { imageFallback, PRODUCT_PLACEHOLDER } from '@/shared/utils/imageFallback';
import { toApiError } from '@/shared/lib/api';
import { useUIStore } from '@/shared/store/uiStore';

const MAX_FEATURED = 12;

/**
 * Featured products picker: up to 12 published listings from any of the
 * mall's substores, shown as the hero rail of the public mall page.
 *
 * Selections autosave. They used to sit behind a Save button in the page
 * header, far from the grid, while clicking a card stamped it "Featured"
 * immediately — so the page looked saved when it was not, and leaving threw
 * the selection away. QA reported that as "featured products are not stored
 * in the database"; the write was fine, nobody had pressed the button.
 */

/** Order-independent identity for a selection, for "has this been saved?". */
const keyOf = (ids: Iterable<string>) => [...ids].sort().join(',');

type SaveState = 'clean' | 'pending' | 'saving' | 'error';

interface PoolItem extends Listing {
  substoreName: string;
}

export default function MallFeatured() {
  const [pool, setPool] = useState<PoolItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('clean');
  const addToast = useUIStore((s) => s.addToast);

  // What the server currently holds, and the live selection — both as refs so
  // the unmount flush below reads the latest values rather than the ones
  // captured when the effect was created.
  const savedKeyRef = useRef('');
  const selectedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [mallRes, listingsRes] = await Promise.all([
        mallService.getMyMall(),
        mallService.listMallListings({ status: 'PUBLISHED' }),
      ]);
      const items = listingsRes.data.map((l) => ({ ...l, substoreName: l.store.name }));
      setPool(items);

      // Seed the selection with the STORED ids intersected with the pool: an
      // id whose listing was since unpublished or its substore archived is
      // invisible here, and keeping it selected would make every Save fail
      // the server's published-only validation with no way to un-tick it.
      const poolIds = new Set(items.map((l) => l.id));
      const seed = new Set((mallRes.data.featuredListingIds ?? []).filter((id) => poolIds.has(id)));
      setSelected(seed);
      selectedRef.current = seed;
      // Baseline is the SEED, not the stored ids. They differ whenever a
      // featured listing has been unpublished since — and baselining on the
      // stored ids would make the autosave below fire on load and write the
      // narrowed set back, silently un-featuring a listing the owner had only
      // temporarily hidden. Nothing is written until the owner actually picks.
      savedKeyRef.current = keyOf(seed);
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Failed to load your listings').message });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_FEATURED) {
          addToast({ type: 'error', message: `You can feature at most ${MAX_FEATURED} products` });
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const persist = useCallback(
    async (ids: string[]) => {
      setSaveState('saving');
      try {
        await mallService.setFeatured(ids);
        savedKeyRef.current = keyOf(ids);
        // Only settle to clean if nothing was toggled while the request was
        // in flight — otherwise the newer selection is still unsaved.
        setSaveState((prev) =>
          prev === 'saving' && keyOf(selectedRef.current) === savedKeyRef.current ? 'clean' : prev,
        );
      } catch (err: unknown) {
        setSaveState('error');
        addToast({ type: 'error', message: toApiError(err, 'Could not save your selection').message });
      }
    },
    [addToast],
  );

  // Debounced autosave. Ticking several cards in a row sends one request.
  useEffect(() => {
    selectedRef.current = selected;
    if (loading) return;
    if (keyOf(selected) === savedKeyRef.current) return;

    setSaveState('pending');
    timerRef.current = setTimeout(() => persist([...selected]), 700);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selected, loading, persist]);

  // Leaving the page mid-debounce is exactly the case QA hit. React Router
  // unmounts without unloading the document, so the request still goes out —
  // fire-and-forget, since there is no longer a component to report to.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const ids = [...selectedRef.current];
      if (keyOf(ids) !== savedKeyRef.current) {
        mallService.setFeatured(ids).catch(() => {});
      }
    },
    [],
  );

  // A full page unload (tab close, reload, external link) would kill the
  // in-flight save, so warn while anything is genuinely unsaved.
  useEffect(() => {
    if (saveState !== 'pending' && saveState !== 'saving') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  const bySubstore = useMemo(() => {
    const groups = new Map<string, PoolItem[]>();
    for (const item of pool) {
      const list = groups.get(item.substoreName) ?? [];
      list.push(item);
      groups.set(item.substoreName, list);
    }
    return [...groups.entries()];
  }, [pool]);

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Featured Products</h1>
          <p className="ws-page__sub">
            Pick up to {MAX_FEATURED} published listings to headline your mall
            page. Your choices save automatically.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
          <span className="ws-caption ws-muted ws-num">
            {selected.size}/{MAX_FEATURED} selected
          </span>
          {saveState === 'error' ? (
            <button
              className="ws-btn ws-btn--sm ws-btn--secondary"
              onClick={() => persist([...selected])}
            >
              Not saved — retry
            </button>
          ) : (
            <span
              className="ws-caption"
              role="status"
              aria-live="polite"
              style={{
                color:
                  saveState === 'clean' ? 'var(--ws-status-success)' : 'var(--ws-text-secondary)',
              }}
            >
              {saveState === 'clean' ? 'All changes saved' : 'Saving…'}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ws-skeleton" style={{ height: 280, borderRadius: 'var(--ws-radius-xl)' }} />
      ) : pool.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon"><Sparkles size={26} aria-hidden /></div>
          <h2 className="ws-title">Nothing to feature yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '44ch' }}>
            Featured products are chosen from your stores' published
            listings. Publish some listings first, then come back here.
          </p>
        </div>
      ) : (
        <div className="ws-stack--lg">
          {bySubstore.map(([substoreName, items]) => (
            <section key={substoreName}>
              <h2 className="ws-title" style={{ marginBottom: 'var(--ws-space-3)' }}>{substoreName}</h2>
              <div
                style={{
                  display: 'grid',
                  gap: 'var(--ws-space-3)',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                }}
              >
                {items.map((l) => {
                  const isSelected = selected.has(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      className="ws-card"
                      onClick={() => toggle(l.id)}
                      aria-pressed={isSelected}
                      style={{
                        padding: 'var(--ws-space-2)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: isSelected
                          ? '2px solid var(--ws-brand)'
                          : '2px solid transparent',
                      }}
                    >
                      <img
                        src={firstImage(l) || PRODUCT_PLACEHOLDER}
                        onError={imageFallback(PRODUCT_PLACEHOLDER)}
                        alt=""
                        loading="lazy"
                        style={{
                          width: '100%', aspectRatio: '4 / 3', objectFit: 'cover',
                          borderRadius: 'var(--ws-radius-md)', display: 'block',
                          marginBottom: 'var(--ws-space-2)',
                        }}
                      />
                      <p style={{ fontWeight: 600, margin: 0 }}>
                        {l.name}
                      </p>
                      <p className="ws-caption ws-muted ws-num" style={{ margin: 0 }}>
                        {priceLabel(l)}
                      </p>
                      {isSelected && (
                        <span className="ws-badge ws-badge--success" style={{ marginTop: 'var(--ws-space-1)' }}>
                          Featured
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
