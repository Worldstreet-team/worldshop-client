import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Car, House, MessageCircle, ShieldCheck, Shirt,
  ShoppingBag, Smartphone, Tag, type LucideIcon,
} from 'lucide-react';
import { publicMarketplace, type Listing, type PublicStore } from '@/services/storeService';
import { useCategoryStore } from '@/store/categoryStore';
import { resolveCategoryIds } from '@/utils/categoryTree';
import { usePageTitle } from '@/hooks/usePageTitle';
import HeroCarousel from '@/components/marketplace/HeroCarousel';
import ListingCard from '@/components/marketplace/ListingCard';
import StoreCard from '@/components/marketplace/StoreCard';

/**
 * The landing page. The full marketplace grid lives at /listings; this page's
 * job is orientation — segment the catalog the way the big marketplaces do
 * (hero → categories → curated rails → sellers) and funnel a visitor
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
  usePageTitle();
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

  // The motors rail waits on the category tree — "Vehicles" is a department
  // (parent) id, and listings only ever save under one of its subcategories
  // (see resolveCategoryIds), so it has to fan out across those rather than
  // query the department id directly.
  const vehiclesId = categories.find((c) => c.slug === 'vehicles' && !c.parentId)?.id ?? '';
  useEffect(() => {
    if (!vehiclesId) return;
    let cancelled = false;
    Promise.all(
      resolveCategoryIds(categories, vehiclesId).map((id) =>
        publicMarketplace.browse({ categoryId: id, limit: RAIL_SIZE }).then((res) => res.data).catch(() => [] as Row[]),
      ),
    ).then((groups) => {
      if (cancelled) return;
      const merged = new Map<string, Row>();
      for (const group of groups) for (const l of group) merged.set(l.id, l);
      const rows = [...merged.values()]
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
        .slice(0, RAIL_SIZE);
      setMotors(rows);
    });
    return () => { cancelled = true; };
  }, [vehiclesId, categories]);

  // Every top-level category, including a flat one with no subcategories —
  // otherwise it's invisible here even though it's a real, browsable department.
  const departments = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );

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
        {/* ── Hero carousel: cutout compositions, eBay-style rotation ── */}
        <HeroCarousel
          motorsTo={vehiclesId ? `/listings?categoryId=${vehiclesId}` : '/listings'}
          stat={total}
        />

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

        <Rail title="New arrivals" to="/listings" items={newest} loading={loading} />

        <Rail title="Under ₦100,000" to="/listings?maxPrice=100000" items={deals} loading={loading} />
        {vehiclesId && (
          <Rail title="Motors" to={`/listings?categoryId=${vehiclesId}`} items={motors} loading={loading} />
        )}

        {/* ── Sellers ──────────────────────────────────────────────── */}
        {sellers.length > 0 && (
          <section aria-label="Sellers to know">
            <h2 className="ws-h2 ws-home__heading">Sellers to know</h2>
            <div className="ws-sellers">
              {sellers.map((s) => <StoreCard key={s.id} store={s} />)}
            </div>
          </section>
        )}

        {/* ── Sell band ────────────────────────────────────────────── */}
        <section className="ws-sellband" aria-label="Start selling">
          <div className="ws-sellband__intro">
            <p className="ws-sellband__eyebrow">Start selling</p>
            <h2 className="ws-h1">Selling? List it in minutes.</h2>
            <p className="ws-sellband__sub">
              Open a store, post your first listing and talk to buyers directly.
              What you sell is yours — WorldStreet takes no commission.
            </p>
            <div className="ws-sellband__actions">
              <Link to="/vendor" className="ws-btn ws-btn--primary ws-sellband__cta">
                Open a store
                <ArrowRight size={16} aria-hidden />
              </Link>
              <span className="ws-sellband__note">Free · takes about two minutes</span>
            </div>
          </div>
          {/* Numbered because selling really is a sequence. */}
          <ol className="ws-sellband__steps">
            <li className="ws-sellband__step">
              <span className="ws-sellband__num ws-num" aria-hidden>1</span>
              <div>
                <h3 className="ws-sellband__steptitle">Open your store</h3>
                <p className="ws-sellband__stepcopy">Pick a name, add your location and contact.</p>
              </div>
            </li>
            <li className="ws-sellband__step">
              <span className="ws-sellband__num ws-num" aria-hidden>2</span>
              <div>
                <h3 className="ws-sellband__steptitle">Post your listing</h3>
                <p className="ws-sellband__stepcopy">Photos, price, condition — live in minutes.</p>
              </div>
            </li>
            <li className="ws-sellband__step">
              <span className="ws-sellband__num ws-num" aria-hidden>3</span>
              <div>
                <h3 className="ws-sellband__steptitle">Chat and close</h3>
                <p className="ws-sellband__stepcopy">Buyers message you directly. Agree your own terms.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* ── How it stays safe — one hairline-divided trust row ───── */}
        <section className="ws-assure" aria-label="How Shop works">
          <div className="ws-assure__item">
            <h3 className="ws-assure__title">
              <MessageCircle size={16} aria-hidden />
              Deal direct
            </h3>
            <p className="ws-assure__copy">Chat with the seller — no middlemen, no markups.</p>
          </div>
          <div className="ws-assure__item">
            <h3 className="ws-assure__title">
              <ShieldCheck size={16} aria-hidden />
              Know your seller
            </h3>
            <p className="ws-assure__copy">Public ratings, reviews and verification on every store.</p>
          </div>
          <div className="ws-assure__item">
            <h3 className="ws-assure__title">
              <Tag size={16} aria-hidden />
              Meet safely
            </h3>
            <p className="ws-assure__copy">Check the item in person before any money moves.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
