import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import ListingCard from '@/features/listings/components/ListingCard';
import { savedListings } from '@/features/listings/savedListings';
import CategoryHead from '@/features/catalog/components/CategoryHead';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

/**
 * The watchlist. Saves are device-local snapshots (see savedListings), so this
 * page renders instantly with no fetch, and prices reflect the moment of
 * saving, which the strapline is honest about.
 */
export default function Saved() {
  usePageTitle('Saved listings');
  const saved = useSyncExternalStore(savedListings.subscribe, savedListings.all);

  return (
    <div className="ws-wrap ws-cx">
      <CategoryHead
        crumbs={[{ label: 'My account', to: '/account' }, { label: 'Saved listings' }]}
        eyebrow={saved.length ? `${saved.length} saved` : 'Saved'}
        title="Saved listings"
      >
        Kept on this device, with the price as it was when you saved it. Tap the heart on a listing to remove it.
      </CategoryHead>

      <div className="ws-acctsaved" aria-live="polite">
        {saved.length === 0 ? (
          <div className="ws-cxempty">
            <div className="ws-cxempty__inner">
              <span className="ws-cxempty__icon"><Bookmark size={20} aria-hidden /></span>
              <p className="ws-cxempty__title">Nothing saved yet</p>
              <p className="ws-cxempty__body">Tap the heart on any listing and it will wait for you here.</p>
              <div className="ws-cxempty__action">
                <Link to="/categories" className="ws-btn ws-btn--sm ws-btn--secondary">Browse categories</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="ws-results">
            {saved.map((s) => <ListingCard key={s.id} listing={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
