import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import StoreHero from '@/features/stores/components/StoreHero';
import StoreListings from '@/features/stores/components/StoreListings';
import StoreAbout from '@/features/stores/components/StoreAbout';
import ContactSeller from '@/features/stores/components/ContactSeller';
import ListingReviews from '@/features/reviews/components/ListingReviews';
import Tabs, { type Tab } from '@/shared/components/Tabs';
import Modal from '@/shared/components/common/Modal';
import { panelId, tabId } from '@/shared/lib/tabs';
import ListingCardSkeleton from '@/features/listings/components/ListingCardSkeleton';
import ReportButton from '@/features/reports/components/ReportButton';
import { useStorePage } from '@/features/stores/hooks/useStorePage';
import { useFollowing } from '@/features/stores/followedStores';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { useUIStore } from '@/shared/store/uiStore';
import type { PublicListing } from '@/features/stores/api';

const TABS_ID = 'store';
type TabKey = 'listings' | 'about' | 'reviews';
const TAB_KEYS: TabKey[] = ['listings', 'about', 'reviews'];

function Crumbs({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="ws-ldcrumbs">
      <ol>
        <li>
          <Link to="/">Home</Link>
          <span aria-hidden>/</span>
        </li>
        {/* The sandbox has no store directory and routes through All
            categories here; this app has one, so the trail uses it. */}
        <li>
          {name ? <Link to="/stores">Stores</Link> : <span aria-current="page">Stores</span>}
          {name && <span aria-hidden>/</span>}
        </li>
        {name && (
          <li>
            <span aria-current="page">{name}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}

function StoreSkeleton() {
  return (
    <div className="ws-wrap ws-shop" aria-busy="true" aria-label="Loading store">
      <Crumbs />
      <div className="ws-shero ws-shero--loading" aria-hidden>
        <div className="ws-shero__cover ws-skeleton" />
        <div className="ws-shero__body">
          <div className="ws-shero__row">
            <span className="ws-shero__avatar ws-skeleton" />
            <div className="ws-shero__id">
              <span className="ws-skeleton" style={{ display: 'block', height: 24, width: 220 }} />
              <span className="ws-skeleton" style={{ display: 'block', height: 14, width: 160, marginTop: 10 }} />
            </div>
          </div>
        </div>
      </div>
      <div className="ws-results ws-shop__grid" style={{ marginTop: 24 }}>
        {Array.from({ length: 5 }, (_, i) => <ListingCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

/**
 * /stores/:slug — a seller's shop, ported from the sandbox's /shops/:slug:
 * the seller header, then Listings, About and Reviews as tabs.
 *
 * Kept from the page it replaces: search inside the shop, server paging, the
 * WhatsApp / phone / website contacts (now in About, since the header carries
 * only the sandbox's two actions), the mall link and the report button.
 */
export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const categoryId = params.get('category') ?? '';
  const tabParam = params.get('tab') as TabKey | null;
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'listings';
  const filters = useMemo(() => ({ page, search, categoryId }), [page, search, categoryId]);
  const data = useStorePage(slug, filters);
  const { store, notFound } = data;
  const { following, toggle } = useFollowing(store?.id ?? '');
  const addToast = useUIStore((s) => s.addToast);
  const [messaging, setMessaging] = useState(false);

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
    (key: TabKey) => update({ tab: key === 'listings' ? null : key, page: null }),
    [update],
  );
  const onPage = useCallback(
    (next: number) => {
      update({ page: next <= 1 ? null : String(next) });
      scrollToTabs();
    },
    [update],
  );

  // Conversations hang off a listing, so a message from the shop is anchored
  // to its newest one; the seller sees which item the buyer came through.
  const anchor = data.catalogue[0];
  const opening = store
    ? `Hi, I found ${store.name} on WorldStore. Do you have anything else in stock?`
    : '';

  if (notFound) {
    return (
      <div className="ws-wrap ws-shop">
        <div className="ws-cxempty ws-shop__missing">
          <div className="ws-cxempty__inner">
            <span className="ws-cxempty__icon"><Store size={20} aria-hidden /></span>
            <p className="ws-cxempty__title">No shop at that address</p>
            <p className="ws-cxempty__body">
              The seller may have closed it, its subscription may have lapsed, or the link is wrong.
            </p>
            <div className="ws-cxempty__action">
              <Link to="/stores" className="ws-btn ws-btn--sm ws-btn--secondary">Browse stores</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!store) return <StoreSkeleton />;

  const mall = store.mall?.status === 'ACTIVE' || store.mall?.status === 'GRACE' ? store.mall : null;
  const count = data.catalogueTotal ?? store.listingCount;
  const tabs: Tab<TabKey>[] = [
    { key: 'listings', label: `Listings (${count.toLocaleString('en-NG')})` },
    { key: 'about', label: 'About' },
    {
      key: 'reviews',
      label: store.reviewCount ? `Reviews (${store.reviewCount.toLocaleString('en-NG')})` : 'Reviews',
    },
  ];

  const follow = () => {
    const now = toggle();
    addToast({ type: 'info', message: now ? `Following ${store.name}` : 'Unfollowed' });
  };

  return (
    <div className="ws-wrap ws-shop">
      <Crumbs name={store.name} />

      <StoreHero
        store={store}
        listingCount={count}
        mall={mall}
        following={following}
        onMessage={anchor ? () => setMessaging(true) : undefined}
        onFollow={follow}
      />

      <section id={TABS_ID} className="ws-shop__tabs" aria-label="Shop">
        <Tabs
          idPrefix={TABS_ID}
          label="Shop"
          tabs={tabs}
          active={tab}
          onChange={(key) => {
            onTab(key);
            scrollToTabs();
          }}
          block="ws-ldtabs"
        />

        <div
          role="tabpanel"
          id={panelId(TABS_ID, tab)}
          aria-labelledby={tabId(TABS_ID, tab)}
          className="ws-shop__panel"
          key={tab}
        >
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

          {tab === 'about' && <StoreAbout store={store} mall={mall} />}

          {tab === 'reviews' &&
            slug &&
            (store.reviewCount > 0 ? (
              <ListingReviews storeSlug={slug} heading={false} />
            ) : (
              <div className="ws-cxempty">
                <div className="ws-cxempty__inner">
                  <p className="ws-cxempty__title">No written reviews yet</p>
                  <p className="ws-cxempty__body">
                    This shop has not been reviewed on WorldStore yet. Reviews come from buyers who
                    messaged the seller about a listing.
                  </p>
                </div>
              </div>
            ))}
        </div>
      </section>

      <footer className="ws-shop__foot">
        <ReportButton targetType="STORE" targetId={store.id} targetName={store.name} label="Report this store" />
      </footer>

      {anchor && (
        <Modal isOpen={messaging} onClose={() => setMessaging(false)} title={`Message ${store.name}`}>
          <ContactSeller
            listing={{ ...anchor, store } as unknown as PublicListing}
            cta={false}
            autoStart={opening}
          />
        </Modal>
      )}
    </div>
  );
}
