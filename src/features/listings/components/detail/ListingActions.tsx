import { Link } from 'react-router-dom';
import { BadgeCheck, ChevronRight, Clock, ShieldAlert, Star } from 'lucide-react';
import type { PublicListing } from '@/features/stores/api';
import ContactSeller from '@/features/stores/components/ContactSeller';
import HowBuyingWorks from '@/features/listings/components/detail/HowBuyingWorks';
import { isVerifiedTier, replyTime, VERIFICATION_LABEL } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

export default function ListingActions({ listing }: { listing: PublicListing }) {
  const store = listing.store;
  const verified = isVerifiedTier(store.verificationTier);
  const place = formatLocation([store.city, store.state], store.country);
  const reply = store.avgResponseMins != null ? replyTime(store.avgResponseMins) : null;

  return (
    <div className="ws-card ws-actionpanel" id="contact-panel">
      <ContactSeller listing={listing} />

      <Link to={`/stores/${store.slug}`} className="ws-sellerline">
        <span className="ws-avatar ws-sellerline__avatar" aria-hidden>
          {store.logo ? <img src={store.logo} alt="" /> : store.name.charAt(0).toUpperCase()}
        </span>

        <span className="ws-sellerline__id">
          <span className="ws-sellerline__name">
            {store.name}
            {verified && (
              <BadgeCheck
                size={14}
                aria-label={VERIFICATION_LABEL[store.verificationTier]}
                className="ws-sellerline__tick"
              />
            )}
          </span>
          <span className="ws-sellerline__meta">
            {store.reviewCount > 0 ? (
              <>
                <Star size={12} aria-hidden className="ws-storecard__star" />
                <span className="ws-num">{store.avgRating.toFixed(1)}</span>
                <span>({store.reviewCount})</span>
              </>
            ) : (
              <span>New seller</span>
            )}
            {reply && (
              <>
                <span aria-hidden>·</span>
                <Clock size={12} aria-hidden />
                <span>Replies in {reply}</span>
              </>
            )}
          </span>
          {place && <span className="ws-sellerline__place">{place}</span>}
        </span>

        <ChevronRight size={18} aria-hidden className="ws-sellerline__go" />
      </Link>

      <HowBuyingWorks />

      <p className="ws-safety ws-actionpanel__safety">
        <ShieldAlert size={16} aria-hidden />
        <span>
          Never pay before you have seen the item. WorldStore does not handle payment or
          delivery, so there is no refund if a deal goes wrong.
        </span>
      </p>
    </div>
  );
}
