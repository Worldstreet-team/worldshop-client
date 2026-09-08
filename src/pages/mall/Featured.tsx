import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { mallService } from '@/services/mallService';
import { type Listing } from '@/services/storeService';
import { firstImage, priceLabel } from '@/utils/listingFormat';
import { imageFallback, PRODUCT_PLACEHOLDER } from '@/utils/imageFallback';
import { toApiError } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

const MAX_FEATURED = 12;

/**
 * Featured products picker: up to 12 published listings from any of the
 * mall's substores, shown as the hero rail of the public mall page.
 */

interface PoolItem extends Listing {
  substoreName: string;
}

export default function MallFeatured() {
  const [pool, setPool] = useState<PoolItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

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
      setSelected(new Set((mallRes.data.featuredListingIds ?? []).filter((id) => poolIds.has(id))));
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await mallService.setFeatured([...selected]);
      addToast({ type: 'success', message: 'Featured products updated' });
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not save your selection').message });
    } finally {
      setSaving(false);
    }
  };

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
            Pick up to {MAX_FEATURED} published listings to headline your mall page.
          </p>
        </div>
        <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving…' : `Save (${selected.size}/${MAX_FEATURED})`}
        </button>
      </div>

      {loading ? (
        <div className="ws-skeleton" style={{ height: 280, borderRadius: 'var(--ws-radius-xl)' }} />
      ) : pool.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon"><Sparkles size={26} aria-hidden /></div>
          <h2 className="ws-title">Nothing to feature yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '44ch' }}>
            Featured products are chosen from your substores' published
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
