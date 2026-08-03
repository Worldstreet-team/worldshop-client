import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgePercent, Car, House, MessageCircle, ShieldCheck, Shirt,
  ShoppingBag, Smartphone, Store, Tag, Ticket, type LucideIcon,
} from 'lucide-react';
import { publicMarketplace, type Listing, type PublicStore } from '@/services/storeService';
import { useCategoryStore } from '@/store/categoryStore';
import ListingCard from '@/components/marketplace/ListingCard';
import SellerCard from '@/components/marketplace/SellerCard';
import { firstImage, priceLabel } from '@/utils/listingFormat';

/**
 * The landing page. The full marketplace grid lives at /listings; this page's
 * job is orientation — segment the catalog the way the big marketplaces do
 * (hero → categories → curated rails → promo → sellers) and funnel a visitor
 * toward browsing or selling.
 *
 * Every section is fed by the same public /listings endpoint the browse page
 * uses, so the hero deck and rails always show real, live inventory — there is
 * no hand-picked "featured" data to go stale. Sellers are deduped out of the
 * rails' embedded stores rather than fetched from a dedicated endpoint the
 * backend does not have.
 */

type Row = Listing & { store: PublicStore };

const CATEGORY_ICON: Record<string, LucideIcon> = {
  electronics: Smartphone,
  vehicles: Car,
  fashion: Shirt,
  'home-property': House,
};

const RAIL_SIZE = 8;

function Rail({
  title,
  to,
  items,
  loading,
}: {
  title: string;
  to: string;
  items: Row[];
  loading: boolean;
}) {
  if (!loading && items.length === 0) return null;
  return (
    <section className="ws-rail" aria-label={title}>
      <div className="ws-rail__head">
        <h2 className="ws-h2">{title}</h2>
        <Link to={to} className="ws-rail__more">
          See all
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      <div className="ws-rail__track">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <div className="ws-pcard" key={i} aria-hidden>
                <div className="ws-skeleton ws-pcard__media" />
                <div className="ws-pcard__body">
                  <div className="ws-skeleton" style={{ height: 16, width: '55%' }} />
                  <div className="ws-skeleton" style={{ height: 14, width: '85%' }} />
                </div>
              </div>
            ))
          : items.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
      </div>
    </section>
  );
}

export default function Home() {
  const { categories, fetchCategories } = useCategoryStore();

  const [newest, setNewest] = useState<Row[]>([]);
  const [deals, setDeals] = useState<Row[]>([]);
  const [motors, setMotors] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      publicMarketplace.browse({ limit: RAIL_SIZE }),
      publicMarketplace.browse({ maxPrice: 100000, limit: RAIL_SIZE }),
    ]).then(([a, b]) => {
      if (cancelled) return;
      if (a.status === 'fulfilled') {
        setNewest(a.value.data);
        setTotal(a.value.pagination.total);
      }
      if (b.status === 'fulfilled') setDeals(b.value.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // The motors rail waits on the category tree — it browses by parent id, and
  // ids are backend-assigned, so the slug has to be resolved first.
  const vehiclesId = categories.find((c) => c.slug === 'vehicles' && !c.parentId)?.id ?? '';
  useEffect(() => {
    if (!vehiclesId) return;
    let cancelled = false;
    publicMarketplace
      .browse({ categoryId: vehiclesId, limit: RAIL_SIZE })
      .then((res) => { if (!cancelled) setMotors(res.data); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [vehiclesId]);

  const departments = useMemo(() => {
    const withChildren = new Set(categories.map((c) => c.parentId).filter(Boolean));
    return categories.filter((c) => !c.parentId && withChildren.has(c.id));
  }, [categories]);

  // Three most recent listings that actually have a photo carry the hero.
  const deck = useMemo(() => newest.filter((l) => firstImage(l)).slice(0, 3), [newest]);

  const sellers = useMemo(() => {
    const seen = new Map<string, PublicStore>();
    for (const l of [...newest, ...motors, ...deals]) {
      if (l.store && !seen.has(l.store.id)) seen.set(l.store.id, l.store);
    }
    return [...seen.values()].slice(0, 4);
  }, [newest, motors, deals]);

  return (
    <div className="ws-wrap">
      <div className="ws-home">
        {/* ── Hero: what Nigeria is selling, literally ─────────────── */}
        <section className="ws-hero" aria-label="Welcome">
          <div>
            <p className="ws-hero__eyebrow">The WorldStreet marketplace</p>
            <h1 className="ws-hero__title">
              Everything Nigeria is <em>selling</em>.
            </h1>
            <p className="ws-hero__sub">
              Phones, cars, fashion, property — new listings from rated stores
              every day. Chat directly with the seller and agree your own terms.
            </p>
            <div className="ws-hero__ctas">
              <Link to="/listings" className="ws-btn ws-btn--primary">
                Browse listings
              </Link>
              <Link to="/vendor" className="ws-btn ws-btn--secondary">
                <Store size={16} aria-hidden />
                Open a store
              </Link>
            </div>
            {total > 0 && (
              <p className="ws-hero__stat ws-num">
                {total.toLocaleString('en-NG')} live listings right now
              </p>
            )}
          </div>

          <div className="ws-hero__deck" aria-hidden={deck.length === 0}>
            {(loading ? [] : deck).map((l, i) => (
              <Link
                key={l.id}
                to={`/listings/${l.slug}`}
                className={`ws-hero__card ws-hero__card--${i}`}
                aria-label={`${l.name}, ${priceLabel(l)}`}
              >
                <img src={firstImage(l) ?? undefined} alt="" />
                <span className="ws-hero__price ws-num">{priceLabel(l)}</span>
              </Link>
            ))}
            {loading &&
              [0, 1, 2].map((i) => (
                <div key={i} className={`ws-hero__card ws-hero__card--${i} ws-skeleton`} />
              ))}
          </div>
        </section>

        {/* ── Departments ──────────────────────────────────────────── */}
        {departments.length > 0 && (
          <section aria-label="Shop by category">
            <h2 className="ws-h2 ws-home__heading">Shop by category</h2>
            <div className="ws-cats">
              <Link to="/listings" className="ws-cat">
                <span className="ws-cat__disc"><ShoppingBag size={26} aria-hidden /></span>
                <span className="ws-cat__label">Everything</span>
              </Link>
              {departments.map((c) => {
                const Icon = CATEGORY_ICON[c.slug] ?? ShoppingBag;
                return (
                  <Link key={c.id} to={`/listings?categoryId=${c.id}`} className="ws-cat">
                    <span className="ws-cat__disc"><Icon size={26} aria-hidden /></span>
                    <span className="ws-cat__label">{c.name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <Rail title="Trending now" to="/listings" items={newest} loading={loading} />

        {/* ── Promo placeholder — coupons aren't live yet ──────────── */}
        <section className="ws-promo" aria-label="Coupons are coming">
          <div>
            <h2 className="ws-promo__title">Coupons land here soon.</h2>
            <p className="ws-promo__sub">
              Seller deals and season openers are on their way. Until then,
              fresh finds drop every day.
            </p>
            <Link to="/listings" className="ws-btn ws-btn--primary">
              See what&rsquo;s new
            </Link>
          </div>
          <div className="ws-promo__cards" aria-hidden>
            <span className="ws-promo__card ws-promo__card--1">
              <Tag size={22} />
              Deals
            </span>
            <span className="ws-promo__card ws-promo__card--2">
              <BadgePercent size={22} />
              Coupons
            </span>
            <span className="ws-promo__card ws-promo__card--3">
              <Ticket size={22} />
              Soon
            </span>
          </div>
        </section>

        <Rail title="Under ₦100,000" to="/listings?maxPrice=100000" items={deals} loading={loading} />
        {vehiclesId && (
          <Rail title="Motors" to={`/listings?categoryId=${vehiclesId}`} items={motors} loading={loading} />
        )}

        {/* ── Sellers ──────────────────────────────────────────────── */}
        {sellers.length > 0 && (
          <section aria-label="Sellers to know">
            <h2 className="ws-h2 ws-home__heading">Sellers to know</h2>
            <div className="ws-sellers">
              {sellers.map((s) => <SellerCard key={s.id} store={s} />)}
            </div>
          </section>
        )}

        {/* ── Sell band ────────────────────────────────────────────── */}
        <section className="ws-sellband" aria-label="Start selling">
          <div>
            <h2 className="ws-h1">Selling? List it in minutes.</h2>
            <p className="ws-sellband__sub">
              Open a store, post your first listing and talk to buyers directly.
              No commission on what you sell.
            </p>
          </div>
          <Link to="/vendor" className="ws-btn ws-btn--primary ws-sellband__cta">
            Open a store
            <ArrowRight size={16} aria-hidden />
          </Link>
        </section>

        {/* ── How it stays safe ────────────────────────────────────── */}
        <section className="ws-trust" aria-label="How Shop works">
          <div className="ws-trust__item">
            <MessageCircle size={20} aria-hidden />
            <div>
              <h3 className="ws-trust__title">Deal direct</h3>
              <p className="ws-trust__copy">Chat with the seller — no middlemen, no markups.</p>
            </div>
          </div>
          <div className="ws-trust__item">
            <ShieldCheck size={20} aria-hidden />
            <div>
              <h3 className="ws-trust__title">Know your seller</h3>
              <p className="ws-trust__copy">Public ratings, reviews and verification on every store.</p>
            </div>
          </div>
          <div className="ws-trust__item">
            <Tag size={20} aria-hidden />
            <div>
              <h3 className="ws-trust__title">Meet safely</h3>
              <p className="ws-trust__copy">Check the item in person before any money moves.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
