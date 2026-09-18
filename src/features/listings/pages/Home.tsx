import { Link } from 'react-router-dom';
import {
  ArrowRight, Car, House, MessageCircle, ShieldCheck, Shirt,
  ShoppingBag, Smartphone, Tag, type LucideIcon,
} from 'lucide-react';
import type { Listing, PublicStore } from '@/features/stores/api';
import { useHomeRails } from '@/features/listings/hooks/useHomeRails';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import HeroCarousel from '@/features/listings/components/HeroCarousel';
import ListingCard from '@/features/listings/components/ListingCard';
import ListingCardSkeleton from '@/features/listings/components/ListingCardSkeleton';
import StoreCard from '@/features/stores/components/StoreCard';

type Row = Listing & { store: PublicStore };

const CATEGORY_ICON: Record<string, LucideIcon> = {
  electronics: Smartphone,
  vehicles: Car,
  fashion: Shirt,
  'home-property': House,
};

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
          ? Array.from({ length: 5 }, (_, i) => <ListingCardSkeleton key={i} showSeller />)
          : items.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
      </div>
    </section>
  );
}

export default function Home() {
  usePageTitle();
  const {
    departments, vehiclesId, total, newest, deals, motors, sellers, loading, motorsLoading,
  } = useHomeRails();

  return (
    <div className="ws-wrap">
      <div className="ws-home">

        <HeroCarousel
          motorsTo={vehiclesId ? `/listings?categoryId=${vehiclesId}` : '/listings'}
          stat={total}
        />

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
          <Rail title="Motors" to={`/listings?categoryId=${vehiclesId}`} items={motors} loading={motorsLoading} />
        )}

        {sellers.length > 0 && (
          <section aria-label="Sellers to know">
            <h2 className="ws-h2 ws-home__heading">Sellers to know</h2>
            <div className="ws-sellers">
              {sellers.map((s) => <StoreCard key={s.id} store={s} />)}
            </div>
          </section>
        )}

        <section className="ws-sellband" aria-label="Start selling">
          <div className="ws-sellband__intro">
            <p className="ws-sellband__eyebrow">Start selling</p>
            <h2 className="ws-h1">Selling? List it in minutes.</h2>
            <p className="ws-sellband__sub">
              Open a store, post your first listing and talk to buyers directly.
              What you sell is yours — WorldStore takes no commission.
            </p>
            <div className="ws-sellband__actions">
              <Link to="/vendor" className="ws-btn ws-btn--primary ws-sellband__cta">
                Open a store
                <ArrowRight size={16} aria-hidden />
              </Link>
              <span className="ws-sellband__note">Free · takes about two minutes</span>
            </div>
          </div>

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
