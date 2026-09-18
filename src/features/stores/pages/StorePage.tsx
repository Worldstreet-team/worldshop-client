import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Building2, PackageSearch, Phone, ShieldCheck } from 'lucide-react';
import SellerCard from '@/features/stores/components/SellerCard';
import ListingCard from '@/features/listings/components/ListingCard';
import ReportButton from '@/features/reports/components/ReportButton';
import { useStorePage } from '@/features/stores/hooks/useStorePage';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { waLink } from '@/features/listings/model';
import { formatLocation } from '@/shared/utils/locations';

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const {
    store, notFound, listings, total, totalPages, loading, refreshing, prefetchPage,
  } = useStorePage(slug, page);
  const [showPhone, setShowPhone] = useState(false);

  usePageTitle(notFound ? 'Store not available' : store?.name);

  const setPage = (next: number) => {
    const nextParams = new URLSearchParams(params);
    if (next <= 1) nextParams.delete('page');
    else nextParams.set('page', String(next));
    setParams(nextParams);
  };

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

  const location = formatLocation([store.city, store.state], store.country);
  const hasContact = store.phone || store.whatsapp || store.website || store.address;

  return (
    <div className="ws-wrap">
      <div className="ws-detail">
        <div>

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

                {store.mall && (store.mall.status === 'ACTIVE' || store.mall.status === 'GRACE') && (
                  <p className="ws-caption" style={{ marginTop: 4 }}>
                    <Building2 size={12} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
                    Part of{' '}
                    <Link to={`/malls/${store.mall.slug}`} style={{ fontWeight: 600 }}>
                      {store.mall.name}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>

          {store.description && (
            <p className="ws-body ws-muted" style={{ whiteSpace: 'pre-wrap', maxWidth: 'var(--ws-measure)' }}>
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
              <div className="ws-empty" style={{ marginBlock: 'var(--ws-space-8)' }}>
                <span className="ws-empty__icon" aria-hidden><PackageSearch size={22} /></span>
                <h3 className="ws-title">No live listings right now</h3>
                <p className="ws-caption ws-muted" style={{ maxWidth: '34ch' }}>
                  This seller has nothing published at the moment — check back, or browse the marketplace.
                </p>
                <Link to="/listings" className="ws-btn ws-btn--sm ws-btn--secondary">
                  Browse listings
                </Link>
              </div>
            ) : (
              <div
                className={`ws-grid${refreshing ? ' ws-busy' : ''}`}
                style={{ marginTop: 'var(--ws-space-4)' }}
                aria-busy={refreshing || undefined}
              >
                {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="ws-pager">
                <button
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  onMouseEnter={() => prefetchPage(page - 1)}
                  onFocus={() => prefetchPage(page - 1)}
                >
                  Previous
                </button>
                <span className="ws-pager__status ws-num">Page {page} of {totalPages}</span>
                <button
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  onMouseEnter={() => page < totalPages && prefetchPage(page + 1)}
                  onFocus={() => page < totalPages && prefetchPage(page + 1)}
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
              <div className="ws-contact__row">
                {store.phone && (
                  showPhone ? (
                    <a href={`tel:${store.phone}`} className="ws-btn ws-btn--sm ws-btn--secondary ws-num">
                      <Phone size={14} aria-hidden />
                      {store.phone}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="ws-btn ws-btn--sm ws-btn--secondary"
                      onClick={() => setShowPhone(true)}
                    >
                      <Phone size={14} aria-hidden />
                      Show number
                    </button>
                  )
                )}
                {store.whatsapp && (
                  <a
                    href={waLink(store.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ws-btn ws-btn--sm ws-btn--secondary"
                  >
                    WhatsApp
                  </a>
                )}
                {store.website && (
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ws-btn ws-btn--sm ws-btn--secondary"
                  >
                    Website
                  </a>
                )}
              </div>
              {store.address && (
                <p className="ws-caption ws-muted" style={{ marginTop: 'var(--ws-space-3)' }}>
                  {store.address}
                </p>
              )}
            </div>
          )}

          <div className="ws-card">
            <div className="ws-safety">
              <ShieldCheck size={16} aria-hidden />
              <span>WorldStore does not handle payment or delivery. Check items before paying.</span>
            </div>
          </div>

          <div className="ws-aside__report">
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
