import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Globe, MapPin, Phone, Sparkles } from 'lucide-react';
import { publicMalls } from '@/features/malls/api';
import StoreCard from '@/features/stores/components/StoreCard';
import ListingCard from '@/features/listings/components/ListingCard';
import ReportButton from '@/features/reports/components/ReportButton';
import { waLink } from '@/features/listings/model';
import { formatLocation } from '@/shared/utils/locations';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

export default function MallPage() {
  const { slug } = useParams<{ slug: string }>();

  const mallQuery = useQuery({
    queryKey: queryKeys.mall(slug ?? ''),
    queryFn: () => publicMalls.getMall(slug as string).then((res) => res.data),
    enabled: Boolean(slug),
    staleTime: 5 * MINUTE,
  });

  const mall = mallQuery.data ?? null;
  const notFound = mallQuery.isError;

  if (mallQuery.isPending) {
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

  const location = formatLocation([mall.address, mall.city, mall.state], mall.country);

  return (
    <div className="ws-page">
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
            {mall.featuredListings.map((item) => (
              <ListingCard key={item.id} listing={{ ...item, store: undefined }} />
            ))}
          </div>
        </section>
      )}

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
