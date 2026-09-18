import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ImageOff, MapPin, Star } from 'lucide-react';
import type { Listing, PublicStore } from '@/features/stores/api';
import { firstImage, imageSrc, priceLabel, type ImageRef } from '@/features/listings/model';
import { savedListings } from '@/features/listings/savedListings';
import { useListingPrefetch } from '@/features/listings/hooks/useListingPrefetch';
import { formatLocation } from '@/shared/utils/locations';

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New',
  USED: 'Used',
  REFURBISHED: 'Refurbished',
};

export type CardListing = Pick<
  Listing,
  'id' | 'slug' | 'name' | 'condition' | 'city' | 'state' | 'images' | 'priceType' | 'basePrice' | 'maxPrice'
> & { country?: string };

export default function ListingCard({
  listing,
  showSeller = false,
}: {
  listing: CardListing & { store?: PublicStore };
  showSeller?: boolean;
}) {
  const img = firstImage(listing);
  const images = (listing.images as ImageRef[]) ?? [];
  const hoverImg = images.length > 1 ? imageSrc(images[1]) : '';
  const location = formatLocation([listing.city, listing.state], listing.country);
  const condition = listing.condition ? CONDITION_LABEL[listing.condition] ?? listing.condition : null;
  const saved = useSyncExternalStore(savedListings.subscribe, () => savedListings.has(listing.id));
  const prefetch = useListingPrefetch();
  const warm = () => prefetch(listing.slug || listing.id);

  return (
    <Link
      to={`/listings/${listing.slug}`}
      className="ws-plink"
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
    >
      <article className="ws-pcard">
        <div className="ws-pcard__media">
          {img ? (
            <>
              <img src={img} alt={listing.name} loading="lazy" />
              {hoverImg && (
                <img src={hoverImg} alt="" aria-hidden loading="lazy" className="ws-pcard__alt" />
              )}
            </>
          ) : (
            <div className="ws-pcard__noimg">
              <ImageOff size={20} aria-hidden />
              No photo
            </div>
          )}

          {condition && (
            <div className="ws-pcard__badges">
              <span className="ws-badge ws-badge--ink">{condition}</span>
            </div>
          )}

          <button
            type="button"
            className={`ws-pcard__save${saved ? ' is-saved' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
            aria-pressed={saved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              savedListings.toggle(listing);
            }}
          >
            <Heart size={16} aria-hidden />
          </button>
        </div>

        <div className="ws-pcard__body">
          <div className="ws-price">{priceLabel(listing)}</div>
          <h3 className="ws-pcard__title">{listing.name}</h3>

          {location && (
            <p className="ws-pcard__meta">
              <MapPin size={12} aria-hidden />
              <span>{location}</span>
            </p>
          )}

          {showSeller && listing.store && (
            <p className="ws-pcard__seller">
              <b>{listing.store.name}</b>

              {listing.store.reviewCount > 0 && (
                <span className="ws-rating" aria-label={`Seller rated ${listing.store.avgRating.toFixed(1)} out of 5`}>
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
