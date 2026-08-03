import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import ListingCard from '@/components/marketplace/ListingCard';
import { savedListings } from '@/utils/savedListings';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * The watchlist. Saves are device-local snapshots (see utils/savedListings),
 * so this page renders instantly with no fetch — and prices reflect the
 * moment of saving, which the caption is honest about.
 */
export default function Saved() {
  usePageTitle('Saved listings');
  const saved = useSyncExternalStore(savedListings.subscribe, savedListings.all);

  return (
    <div className="ws-wrap">
      <div className="ws-browse__head" style={{ marginTop: 'var(--ws-space-6)' }}>
        <div>
          <h1 className="ws-h1">Saved listings</h1>
          <p className="ws-caption ws-muted" aria-live="polite">
            {saved.length === 0
              ? 'Nothing saved on this device yet.'
              : `${saved.length} saved on this device · tap the heart to remove`}
          </p>
        </div>
      </div>

      {saved.length === 0 ? (
        <div className="ws-empty" style={{ marginBlock: 'var(--ws-space-8)' }}>
          <span className="ws-empty__icon" aria-hidden><Heart size={22} /></span>
          <h2 className="ws-title">Nothing saved yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '34ch' }}>
            Tap the heart on any listing and it will wait for you here.
          </p>
          <Link to="/listings" className="ws-btn ws-btn--primary">Browse listings</Link>
        </div>
      ) : (
        <div className="ws-grid" style={{ marginBlock: 'var(--ws-space-6) var(--ws-space-10)' }}>
          {saved.map((s) => <ListingCard key={s.id} listing={s} />)}
        </div>
      )}
    </div>
  );
}
