import { Link } from 'react-router-dom';
import type { Listing, PublicStore } from '@/services/storeService';
import { firstImage, priceLabel } from '@/utils/listingFormat';

/**
 * A listing in a grid. Shared by browse and the storefront so the two never
 * drift apart on price formatting or what counts as a missing photo.
 *
 * The seller line is optional: on a store page every card has the same seller,
 * so repeating it is noise.
 */
export default function ListingCard({
  listing,
  showSeller = false,
}: {
  listing: Listing & { store?: PublicStore };
  showSeller?: boolean;
}) {
  const img = firstImage(listing);
  const location = [listing.city, listing.state].filter(Boolean).join(', ');

  return (
    <Link
      to={`/listings/${listing.slug}`}
      style={{
        border: '1px solid #e4e7ec', borderRadius: 8, overflow: 'hidden',
        textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column',
      }}
    >
      {img ? (
        <img src={img} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
      ) : (
        <div style={{ height: 160, background: '#f8f9fc', display: 'grid', placeItems: 'center', color: '#98a2b3', fontSize: '0.85rem' }}>
          No photo
        </div>
      )}

      <div style={{ padding: '0.65rem 0.75rem', display: 'grid', gap: 2 }}>
        <div style={{ fontWeight: 600, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {listing.name}
        </div>

        <div style={{ fontWeight: 700 }}>{priceLabel(listing)}</div>

        {location && <div style={{ fontSize: '0.78rem', color: '#667085' }}>{location}</div>}

        {showSeller && listing.store && (
          <div style={{ fontSize: '0.78rem', color: '#667085', display: 'flex', alignItems: 'center', gap: 4 }}>
            {listing.store.name}
            {/* Rating is the seller's, not the item's — there is nothing to rate
                about an item nobody bought here. */}
            {listing.store.reviewCount > 0 && <> · {listing.store.avgRating.toFixed(1)} ★</>}
          </div>
        )}
      </div>
    </Link>
  );
}
