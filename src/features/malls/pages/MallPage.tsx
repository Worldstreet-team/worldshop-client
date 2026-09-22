import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Globe, MapPin, MessageCircle, ShieldCheck, Store } from 'lucide-react';
import { publicMalls } from '@/features/malls/api';
import StoreHead from '@/features/stores/components/StoreHead';
import StoreCard from '@/features/stores/components/StoreCard';
import StoreCardSkeleton from '@/features/stores/components/StoreCardSkeleton';
import ListingCard from '@/features/listings/components/ListingCard';
import ReportButton from '@/features/reports/components/ReportButton';
import Reveal from '@/shared/components/Reveal';
import Section from '@/shared/components/Section';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { waLink } from '@/features/listings/model';
import { sinceLabel } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

function MallSkeleton() {
  return (
    <div className="ws-wrap">
      <div className="ws-profile" aria-busy="true" aria-label="Loading mall">
        <div className="ws-storehead" aria-hidden>
          <div className="ws-storehead__banner ws-skeleton" />
          <div className="ws-storehead__body">
            <span className="ws-storehead__logo ws-skeleton" />
            <div className="ws-storehead__id">
              <span className="ws-skeleton ws-storecard__skel" style={{ height: 26, width: 220 }} />
              <span className="ws-skeleton ws-storecard__skel" style={{ height: 14, width: 160, marginTop: 10 }} />
            </div>
          </div>
          <div className="ws-storehead__stats ws-skeleton" style={{ height: 64 }} />
        </div>
        <div className="ws-dirgrid">
          {Array.from({ length: 4 }, (_, i) => <StoreCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

export default function MallPage() {
  const { slug } = useParams<{ slug: string }>();

  const mallQuery = useQuery({
    queryKey: queryKeys.mall(slug ?? ''),
    queryFn: () => publicMalls.getMall(slug as string).then((res) => res.data),
    enabled: Boolean(slug),
    staleTime: 5 * MINUTE,
  });

  const mall = mallQuery.data ?? null;
  usePageTitle(mallQuery.isError ? 'Mall not found' : mall?.name);

  if (mallQuery.isPending) return <MallSkeleton />;

  if (mallQuery.isError || !mall) {
    return (
      <div className="ws-wrap">
        <div className="ws-empty" style={{ marginBlock: 'var(--ws-space-16)' }}>
          <span className="ws-empty__icon"><Building2 size={24} aria-hidden /></span>
          <h1 className="ws-title">Mall not found</h1>
          <p className="ws-caption ws-muted">It may have closed, or the link is wrong.</p>
          <Link to="/malls" className="ws-btn ws-btn--sm ws-btn--primary">Browse malls</Link>
        </div>
      </div>
    );
  }

  const location = formatLocation([mall.address, mall.city, mall.state], mall.country);
  const since = sinceLabel(mall.createdAt);
  const storeCount = mall.substores.length;
  const listingCount = mall.substores.reduce((sum, s) => sum + s.listingCount, 0);

  return (
    <div className="ws-wrap">
      <div className="ws-profile">
        <StoreHead
          name={mall.name}
          logo={mall.logo}
          banner={mall.banner}
          fallback={<Building2 size={30} />}
          badge={
            <span className="ws-storecard__kind">
              <Building2 size={12} aria-hidden />
              Mall
            </span>
          }
          meta={
            location && (
              <span className="ws-storehead__fact">
                <MapPin size={14} aria-hidden />
                {location}
              </span>
            )
          }
          stats={[
            { label: storeCount === 1 ? 'Store' : 'Stores', value: storeCount.toLocaleString() },
            { label: 'Live listings', value: listingCount.toLocaleString() },
            {
              label: 'Featured',
              value: mall.featuredListings.length || '—',
              muted: mall.featuredListings.length === 0,
            },
            { label: 'Opened', value: since ?? '—', muted: !since },
          ]}
          actions={
            <>
              {mall.whatsapp && (
                <a
                  href={waLink(mall.whatsapp, `Hi, I found ${mall.name} on WorldStore.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ws-btn ws-btn--sm ws-btn--primary"
                >
                  <MessageCircle size={14} aria-hidden />
                  WhatsApp
                </a>
              )}
              {mall.website && (
                <a
                  href={mall.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ws-btn ws-btn--sm ws-btn--secondary"
                >
                  <Globe size={14} aria-hidden />
                  Website
                </a>
              )}
            </>
          }
        />

        {mall.description && (
          <Reveal as="section" className="ws-profile__about" aria-labelledby="mall-about">
            <h2 className="ws-sectionhead__eyebrow" id="mall-about">About the mall</h2>
            <p className="ws-profile__desc">{mall.description}</p>
          </Reveal>
        )}

        {mall.featuredListings.length > 0 && (
          <Section
            id="mall-featured"
            eyebrow="Featured"
            title={`Picked by ${mall.name}`}
            sub="Listings the mall is highlighting from across its stores."
          >
            <div className="ws-rail__track ws-bleed">
              {mall.featuredListings.map((item, i) => (
                <Reveal className="ws-reveal" index={i} key={item.id}>
                  {/* The featured rows carry a slim store stub, not a PublicStore. */}
                  <ListingCard listing={{ ...item, store: undefined }} />
                </Reveal>
              ))}
            </div>
          </Section>
        )}

        <Section
          id="mall-stores"
          eyebrow="Directory"
          title={`Stores in ${mall.name}`}
          sub="Each store runs its own catalogue. Visit one to see everything it lists."
        >
          {storeCount === 0 ? (
            <div className="ws-empty">
              <span className="ws-empty__icon"><Store size={24} aria-hidden /></span>
              <h3 className="ws-title">No stores are open here yet</h3>
              <p className="ws-caption ws-muted">
                This mall has not opened its storefronts. Browse the rest of the marketplace in the meantime.
              </p>
              <Link to="/stores" className="ws-btn ws-btn--sm ws-btn--secondary">Browse all stores</Link>
            </div>
          ) : (
            <div className="ws-dirgrid">
              {mall.substores.map((s, i) => (
                <Reveal className="ws-reveal" index={i % 4} key={s.id}>
                  {/* "Part of <this mall>" on every card is noise on the mall's own page. */}
                  <StoreCard store={{ ...s, mall: null }} />
                </Reveal>
              ))}
            </div>
          )}
        </Section>

        <footer className="ws-profile__foot">
          <div className="ws-safety">
            <ShieldCheck size={16} aria-hidden />
            <span>WorldStore does not handle payment or delivery. Check items before paying.</span>
          </div>
          <ReportButton
            targetType="MALL"
            targetId={mall.id}
            targetName={mall.name}
            label="Report this mall"
          />
        </footer>
      </div>
    </div>
  );
}
