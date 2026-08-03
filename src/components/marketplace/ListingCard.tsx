import { Link } from 'react-router-dom';
import { ImageOff, MapPin, Star } from 'lucide-react';
import type { Listing, PublicStore } from '@/services/storeService';
import { firstImage, priceLabel } from '@/utils/listingFormat';

/**
 * A listing in a grid. Shared by browse and the storefront so the two never
 * drift apart on price formatting or what counts as a missing photo.
 *
 * Follows the Shop product-card spec: radius 13, 300×210 media, condition badge
 * overlaid top-left, title Medium 14, price display-face Bold 16, location
 * caption 11 in `text/subtle`.
 *
 * The seller line is optional: on a store page every card has the same seller,
 * so repeating it is noise.
 */

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New',
  USED: 'Used',
  REFURBISHED: 'Refurbished',
};

export default function ListingCard({
  listing,
  showSeller = false,
}: {
  listing: Listing & { store?: PublicStore };
  showSeller?: boolean;
}) {
  const img = firstImage(listing);
  const location = [listing.city, listing.state].filter(Boolean).join(', ');
  const condition = listing.condition ? CONDITION_LABEL[listing.condition] ?? listing.condition : null;

  return (
    <Link to={`/listings/${listing.slug}`} className="ws-plink">
      <article className="ws-pcard">
        <div className="ws-pcard__media">
          {img ? (
            <img src={img} alt="" loading="lazy" />
          ) : (
            <div className="ws-pcard__noimg">
              <ImageOff size={20} aria-hidden />
              No photo
            </div>
          )}

          {/* Condition only. "Negotiable" is true of almost every listing, so a
              badge for it labels nothing — it belongs on the detail page. */}
          {condition && (
            <div className="ws-pcard__badges">
              <span className="ws-badge ws-badge--ink">{condition}</span>
            </div>
          )}
        </div>

        <div className="ws-pcard__body">
          <h3 className="ws-pcard__title">{listing.name}</h3>
          <div className="ws-price">{priceLabel(listing)}</div>

          {location && (
            <p className="ws-pcard__meta">
              <MapPin size={12} aria-hidden />
              <span>{location}</span>
            </p>
          )}

          {showSeller && listing.store && (
            <p className="ws-pcard__seller">
              <b>{listing.store.name}</b>
              {/* The rating is the seller's, not the item's — nothing was
                  bought here to rate. */}
              {listing.store.reviewCount > 0 && (
                <span className="ws-rating">
                  <Star size={12} aria-hidden />
                  {listing.store.avgRating.toFixed(1)}
                </span>
              )}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
