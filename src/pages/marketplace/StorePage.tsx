import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { publicMarketplace, type PublicStore, type Listing } from '@/services/storeService';
import SellerCard from '@/components/marketplace/SellerCard';
import ListingCard from '@/components/marketplace/ListingCard';
import ReportButton from '@/components/marketplace/ReportButton';

/**
 * Public storefront.
 *
 * A store page is a seller's shopfront and their reputation in one: the
 * catalogue answers "do they have what I want", the seller card answers "can I
 * trust them and will they reply". Both are needed before someone will make
 * contact, so neither is behind a tab.
 */

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    publicMarketplace
      .getStore(slug)
      .then((res) => {
        if (!cancelled) setStore(res.data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    publicMarketplace
      .getStoreListings(slug, { page, limit: 24 })
      .then((res) => {
        if (cancelled) return;
        setListings(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, page]);

  if (notFound) {
    return (
      <div className="ws-wrap">
        <div className="ws-empty" style={{ marginBlock: 64 }}>
          <h1 className="ws-h2">Store not available</h1>
          <p className="ws-caption ws-muted" style={{ maxWidth: '40ch' }}>
            This store may have closed, or its subscription is not currently active.
          </p>
          <Link to="/listings" className="ws-btn ws-btn--sm ws-btn--primary">
            Browse the marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="ws-wrap">
        <div className="ws-detail">
          <div>
            <div className="ws-skeleton" style={{ height: 200, borderRadius: 'var(--ws-radius-xl)' }} />
            <div className="ws-skeleton" style={{ height: 28, width: '40%', marginTop: 24 }} />
            <div className="ws-skeleton" style={{ height: 18, width: '25%', marginTop: 12 }} />
          </div>
          <div className="ws-skeleton" style={{ height: 280, borderRadius: 'var(--ws-radius-xl)' }} />
        </div>
      </div>
    );
  }

  const location = [store.city, store.state].filter(Boolean).join(', ');
  const hasContact = store.phone || store.whatsapp || store.website || store.address;

  return (
    <div className="ws-wrap">
      <div className="ws-detail">
        <div>
          {/* Banner + logo read as one masthead, so they share a card rather
              than stacking as separate blocks. */}
          <div className="ws-storehead">
            {store.banner && (
              <div className="ws-storehead__banner">
                <img src={store.banner} alt="" />
              </div>
            )}
            <div className="ws-storehead__body">
              {store.logo && (
                <div className="ws-storehead__logo">
                  <img src={store.logo} alt="" />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <h1 className="ws-h1">{store.name}</h1>
                {location && <p className="ws-caption ws-muted">{location}</p>}
              </div>
            </div>
          </div>

          {store.description && (
            <p className="ws-body ws-muted" style={{ whiteSpace: 'pre-wrap' }}>
              {store.description}
            </p>
          )}

          <section className="ws-detail__section">
            <h2 className="ws-h2">
              Listings{' '}
              {total > 0 && <span className="ws-muted ws-num" style={{ fontWeight: 400 }}>({total})</span>}
            </h2>

            {loading ? (
              <div className="ws-grid" style={{ marginTop: 'var(--ws-space-4)' }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="ws-skeleton"
                    style={{ aspectRatio: '3 / 4', borderRadius: 'var(--ws-radius-xl)' }}
                  />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <p className="ws-body ws-muted">This seller has no live listings right now.</p>
            ) : (
              <div className="ws-grid" style={{ marginTop: 'var(--ws-space-4)' }}>
                {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="ws-pager">
                <button
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="ws-pager__status ws-num">Page {page} of {totalPages}</span>
                <button
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className="ws-aside">
          <SellerCard store={store} />

          {hasContact && (
            <div className="ws-card">
              <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-3)' }}>Contact</h2>
              <div className="ws-stack">
                {store.phone && (
                  <a href={`tel:${store.phone}`} className="ws-plink ws-num">{store.phone}</a>
                )}
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ws-plink"
                  >
                    WhatsApp
                  </a>
                )}
                {store.website && (
                  <a href={store.website} target="_blank" rel="noopener noreferrer" className="ws-plink">
                    Website
                  </a>
                )}
                {store.address && <p className="ws-caption ws-muted">{store.address}</p>}
              </div>

              <div className="ws-safety" style={{ marginTop: 'var(--ws-space-4)' }}>
                <ShieldCheck size={16} aria-hidden />
                <span>WorldStreet does not handle payment or delivery. Check items before paying.</span>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <ReportButton
              targetType="STORE"
              targetId={store.id}
              targetName={store.name}
              label="Report this store"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
