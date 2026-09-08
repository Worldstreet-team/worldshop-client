import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, Globe, MapPin, Phone, Sparkles } from 'lucide-react';
import { publicMalls, type PublicMallPage } from '@/services/mallService';
import StoreCard from '@/components/marketplace/StoreCard';
import ListingCard from '@/components/marketplace/ListingCard';
import ReportButton from '@/components/marketplace/ReportButton';
import { waLink } from '@/utils/listingFormat';

/**
 * Public mall page: banner and identity, the owner-curated featured rail,
 * then the substore grid. Everything arrives in one call — the server bundles
 * substores and still-valid featured listings with the mall itself.
 */

export default function MallPage() {
  const { slug } = useParams<{ slug: string }>();
  const [mall, setMall] = useState<PublicMallPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    publicMalls
      .getMall(slug)
      .then((res) => {
        if (!cancelled) setMall(res.data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="ws-page">
        <div className="ws-skeleton" style={{ height: 220, borderRadius: 'var(--ws-radius-xl)', marginBottom: 'var(--ws-space-4)' }} />
        <div className="ws-skeleton" style={{ height: 320, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  if (notFound || !mall) {
    return (
      <div className="ws-page">
        <div className="ws-empty">
          <div className="ws-empty__icon"><Building2 size={26} aria-hidden /></div>
          <h2 className="ws-title">Mall not found</h2>
          <p className="ws-caption ws-muted">It may have closed or the link is wrong.</p>
          <Link to="/malls" className="ws-btn ws-btn--sm ws-btn--primary">Browse malls</Link>
        </div>
      </div>
    );
  }

  const location = [mall.address, mall.city, mall.state].filter(Boolean).join(', ');

  return (
    <div className="ws-page">
      {/* Identity */}
      <section className="ws-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--ws-space-6)' }}>
        <div
          aria-hidden
          style={{
            height: 180,
            background: 'var(--ws-bg-raised)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {mall.banner ? (
            <img src={mall.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Building2 size={40} style={{ color: 'var(--ws-text-muted)' }} />
          )}
        </div>
        <div style={{ padding: 'var(--ws-space-6)', display: 'flex', gap: 'var(--ws-space-4)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <span className="ws-avatar ws-avatar--l" aria-hidden style={{ width: 64, height: 64, fontSize: 24 }}>
            {mall.logo ? <img src={mall.logo} alt="" /> : mall.name.charAt(0).toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="ws-page__title" style={{ marginBottom: 4 }}>{mall.name}</h1>
            {location && (
              <p className="ws-caption ws-muted" style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                <MapPin size={13} aria-hidden />
                {location}
              </p>
            )}
            {mall.description && (
              <p style={{ marginTop: 'var(--ws-space-3)', maxWidth: '70ch' }}>{mall.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap' }}>
            {mall.whatsapp && (
              <a
                href={waLink(mall.whatsapp, `Hi, I found ${mall.name} on WorldStore.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="ws-btn ws-btn--sm ws-btn--primary"
              >
                <Phone size={14} aria-hidden />
                WhatsApp
              </a>
            )}
            {mall.website && (
              <a href={mall.website} target="_blank" rel="noopener noreferrer" className="ws-btn ws-btn--sm ws-btn--secondary">
                <Globe size={14} aria-hidden />
                Website
              </a>
            )}
            <ReportButton
              targetType="MALL"
              targetId={mall.id}
              targetName={mall.name}
              label="Report this mall"
            />
          </div>
        </div>
      </section>

      {/* Featured rail */}
      {mall.featuredListings.length > 0 && (
        <section style={{ marginBottom: 'var(--ws-space-6)' }}>
          <h2 className="ws-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)', marginBottom: 'var(--ws-space-3)' }}>
            <Sparkles size={18} aria-hidden />
            Featured in this mall
          </h2>
          <div
            style={{
              display: 'grid', gap: 'var(--ws-space-4)',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            }}
          >
            {mall.featuredListings.map(({ store: _store, ...listing }) => (
              // The card's optional seller line wants a full PublicStore; the
              // rail's slimmed store object is dropped since showSeller is off.
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* Substores */}
      <section>
        <h2 className="ws-title" style={{ marginBottom: 'var(--ws-space-3)' }}>
          Stores in {mall.name}
          <span className="ws-caption ws-muted ws-num" style={{ marginLeft: 8 }}>({mall.substores.length})</span>
        </h2>
        {mall.substores.length === 0 ? (
          <div className="ws-empty">
            <div className="ws-empty__icon"><Building2 size={26} aria-hidden /></div>
            <h2 className="ws-title">No stores are open here yet</h2>
          </div>
        ) : (
          <div
            style={{
              display: 'grid', gap: 'var(--ws-space-4)',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            }}
          >
            {mall.substores.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
