import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  BadgeCheck, Building2, Globe, MapPin, MessageCircle, Phone, Star, Store,
} from 'lucide-react';
import StoreHead, { type StoreHeadStat } from '@/features/stores/components/StoreHead';
import StoreListings from '@/features/stores/components/StoreListings';
import StoreReviews from '@/features/stores/components/StoreReviews';
import StoreAbout from '@/features/stores/components/StoreAbout';
import StoreTabs, { type StoreTab } from '@/features/stores/components/StoreTabs';
import ListingCardSkeleton from '@/features/listings/components/ListingCardSkeleton';
import ReportButton from '@/features/reports/components/ReportButton';
import { useStorePage } from '@/features/stores/hooks/useStorePage';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { waLink } from '@/features/listings/model';
import type { PublicStore } from '@/features/stores/api';
import {
  isVerifiedTier, panelId, replyTime, sinceLabel, tabId, VERIFICATION_LABEL,
} from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

const TABS_ID = 'store';
type TabKey = 'about' | 'listings' | 'reviews';
const TAB_KEYS: TabKey[] = ['about', 'listings', 'reviews'];

function storeStats(store: PublicStore, liveCount: number | null): StoreHeadStat[] {
  const since = sinceLabel(store.createdAt);
  return [
    store.reviewCount > 0
      ? {
          label: `${store.reviewCount.toLocaleString()} review${store.reviewCount === 1 ? '' : 's'}`,
          value: (
            <>
              <Star size={14} aria-hidden className="ws-storecard__star" />
              {store.avgRating.toFixed(1)}
            </>
          ),
        }
      : { label: 'No reviews', value: 'New', muted: true },
    { label: 'Live listings', value: (liveCount ?? store.listingCount).toLocaleString() },
    store.avgResponseMins != null
      ? { label: 'Replies in', value: replyTime(store.avgResponseMins) }
      : store.responseRate != null
        ? { label: 'Reply rate', value: `${Math.round(store.responseRate * 100)}%` }
        : { label: 'Replies in', value: '—', muted: true },
    { label: 'Selling since', value: since ?? '—', muted: !since },
  ];
}

function StoreSkeleton() {
  return (
    <div className="ws-wrap">
      <div className="ws-profile" aria-busy="true" aria-label="Loading store">
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
        <div className="ws-grid">
          {Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const categoryId = params.get('category') ?? '';
  const tabParam = params.get('tab') as TabKey | null;
  // A shared filtered link lands on the listings it filters, not on About.
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam)
    ? tabParam
    : search || categoryId ? 'listings' : 'about';
  const filters = useMemo(() => ({ page, search, categoryId }), [page, search, categoryId]);
  const data = useStorePage(slug, filters);
  const { store, notFound } = data;
  const [showPhone, setShowPhone] = useState(false);

  usePageTitle(notFound ? 'Store not available' : store?.name);

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: 'q' in updates },
      );
    },
    [setParams],
  );

  const onSearch = useCallback((q: string) => update({ q, page: null }), [update]);
  const onCategory = useCallback((id: string) => update({ category: id, page: null }), [update]);
  const onClear = useCallback(() => update({ q: null, category: null, page: null }), [update]);
  const scrollToTabs = () => {
    const tabs = document.getElementById(TABS_ID);
    if (tabs && tabs.getBoundingClientRect().top < 0) tabs.scrollIntoView({ block: 'start' });
  };

  const onTab = useCallback(
    (key: TabKey) => update({ tab: key === 'about' ? null : key, page: null }),
    [update],
  );
  const onPage = useCallback(
    (next: number) => {
      update({ page: next <= 1 ? null : String(next) });
      scrollToTabs();
    },
    [update],
  );

  if (notFound) {
    return (
      <div className="ws-wrap">
        <div className="ws-empty" style={{ marginBlock: 'var(--ws-space-16)' }}>
          <span className="ws-empty__icon"><Store size={24} aria-hidden /></span>
          <h1 className="ws-title">Store not available</h1>
          <p className="ws-caption ws-muted">
            This store may have closed, or its subscription is not currently active.
          </p>
          <div className="ws-contact__row" style={{ justifyContent: 'center' }}>
            <Link to="/stores" className="ws-btn ws-btn--sm ws-btn--secondary">Browse stores</Link>
            <Link to="/listings" className="ws-btn ws-btn--sm ws-btn--primary">Browse listings</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!store) return <StoreSkeleton />;

  const location = formatLocation([store.city, store.state], store.country);
  const verified = isVerifiedTier(store.verificationTier);
  const mall = store.mall?.status === 'ACTIVE' || store.mall?.status === 'GRACE' ? store.mall : null;
  const tabs: StoreTab<TabKey>[] = [
    { key: 'about', label: 'About' },
    { key: 'listings', label: 'Listings', count: data.catalogueTotal ?? store.listingCount },
    { key: 'reviews', label: 'Reviews', count: store.reviewCount },
  ];

  return (
    <div className="ws-wrap">
      <div className="ws-profile">
        <StoreHead
          name={store.name}
          logo={store.logo}
          banner={store.banner}
          badge={
            verified && (
              <span className="ws-storecard__tier">
                <BadgeCheck size={13} aria-hidden />
                {VERIFICATION_LABEL[store.verificationTier]}
              </span>
            )
          }
          meta={
            <>
              {location && (
                <span className="ws-storehead__fact">
                  <MapPin size={14} aria-hidden />
                  {store.address ? `${store.address}, ${location}` : location}
                </span>
              )}
              {mall && (
                <span className="ws-storehead__fact">
                  <Building2 size={14} aria-hidden />
                  Part of{' '}
                  <Link to={`/malls/${mall.slug}`} className="ws-storehead__link">
                    {mall.name}
                  </Link>
                </span>
              )}
            </>
          }
          stats={storeStats(store, data.catalogueTotal)}
          actions={
            <>
              {store.whatsapp && (
                <a
                  href={waLink(store.whatsapp, `Hi, I found ${store.name} on WorldStore.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ws-btn ws-btn--sm ws-btn--primary"
                >
                  <MessageCircle size={14} aria-hidden />
                  WhatsApp
                </a>
              )}
              {store.phone &&
                (showPhone ? (
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
                ))}
              {store.website && (
                <a
                  href={store.website}
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

        <div id={TABS_ID} className="ws-profile__tabs">
          <StoreTabs
            idPrefix={TABS_ID}
            tabs={tabs}
            active={tab}
            onChange={(key) => {
              onTab(key);
              scrollToTabs();
            }}
          />

          <div
            role="tabpanel"
            id={panelId(TABS_ID, tab)}
            aria-labelledby={tabId(TABS_ID, tab)}
            className="ws-storetabs__panel"
            key={tab}
          >
            {tab === 'about' && (
              <StoreAbout
                store={store}
                mall={mall}
                liveCount={data.catalogueTotal}
                onShowListings={() => onTab('listings')}
              />
            )}

            {tab === 'listings' && (
              <StoreListings
                storeName={store.name}
                listings={data.listings}
                total={data.total}
                totalPages={data.totalPages}
                catalogueTotal={data.catalogueTotal}
                categories={data.categories}
                page={page}
                search={search}
                categoryId={categoryId}
                loading={data.loading}
                refreshing={data.refreshing}
                failed={data.failed}
                onRetry={data.retry}
                onSearch={onSearch}
                onCategory={onCategory}
                onPage={onPage}
                onClear={onClear}
                prefetchPage={data.prefetchPage}
              />
            )}

            {tab === 'reviews' && slug && <StoreReviews slug={slug} />}
          </div>
        </div>

        <footer className="ws-profile__foot">
          <ReportButton
            targetType="STORE"
            targetId={store.id}
            targetName={store.name}
            label="Report this store"
          />
        </footer>
      </div>
    </div>
  );
}
