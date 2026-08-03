import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, MapPin, Eye, ImageOff } from 'lucide-react';
import { publicMarketplace, type PublicListing } from '@/services/storeService';
import ContactSeller from '@/components/marketplace/ContactSeller';
import SellerCard from '@/components/marketplace/SellerCard';
import ListingReviews from '@/components/marketplace/ListingReviews';
import ReportButton from '@/components/marketplace/ReportButton';

/**
 * Public listing page.
 *
 * This replaces the ecommerce product page. There is no cart and no checkout —
 * the page exists to give a buyer enough detail to decide whether to make
 * contact, and then to make contact easy.
 *
 * Detail is shown in the two layers it was captured in: the category's
 * attributes (which buyers can also filter by) and the seller's own custom
 * fields. They are presented as one spec table because a buyer does not care
 * about the distinction — only search does.
 */

const fmtNaira = (n: number) => '₦' + n.toLocaleString('en-NG');

function priceLabel(l: PublicListing): string {
  if (l.priceType === 'ON_REQUEST') return 'Contact for price';
  if (l.priceType === 'RANGE' && l.basePrice != null && l.maxPrice != null) {
    return `${fmtNaira(l.basePrice)} – ${fmtNaira(l.maxPrice)}`;
  }
  return l.basePrice != null ? fmtNaira(l.basePrice) : 'Contact for price';
}

type ImageRef = Record<string, unknown> & { key?: string; url?: string };
const imageSrc = (img: ImageRef) => String(img.url || img.key || '');

export default function ListingDetail() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;
    setActiveImage(0);

    publicMarketplace
      .getListing(idOrSlug)
      .then((res) => {
        if (!cancelled) setListing(res.data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="ws-wrap">
        <div className="ws-detail">
          <div>
            <div className="ws-skeleton" style={{ aspectRatio: '4 / 3', borderRadius: 'var(--ws-radius-xl)' }} />
            <div className="ws-skeleton" style={{ height: 28, width: '60%', marginTop: 24 }} />
            <div className="ws-skeleton" style={{ height: 22, width: '30%', marginTop: 12 }} />
          </div>
          <div className="ws-skeleton" style={{ height: 280, borderRadius: 'var(--ws-radius-xl)' }} />
        </div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="ws-wrap">
        <div className="ws-empty" style={{ marginBlock: 64 }}>
          <h1 className="ws-h2">Listing not available</h1>
          <p className="ws-caption ws-muted" style={{ maxWidth: '40ch' }}>
            This listing may have been removed, or the seller's store is not
            currently active.
          </p>
          <Link to="/listings" className="ws-btn ws-btn--sm ws-btn--primary">
            Browse the marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = (listing.images as ImageRef[]) ?? [];
  const location = [listing.city, listing.state].filter(Boolean).join(', ');
  // One table: the split between category attributes and the seller's own
  // fields matters to search, not to the person reading the page.
  const specs = [
    ...(listing.condition ? [{ label: 'Condition', value: listing.condition.charAt(0) + listing.condition.slice(1).toLowerCase() }] : []),
    ...Object.entries(listing.attributes ?? {}).map(([label, value]) => ({ label, value: String(value) })),
    ...(listing.customFields ?? []),
  ];

  return (
    <div className="ws-wrap">
      <nav className="ws-crumbs" aria-label="Breadcrumb">
        <Link to="/listings">Marketplace</Link>
        {listing.category && (
          <>
            <ChevronRight size={14} aria-hidden />
            <Link to={`/listings?categoryId=${listing.category.id}`}>{listing.category.name}</Link>
          </>
        )}
      </nav>

      <div className="ws-detail">
        <div>
          <div className="ws-gallery">
            <div className="ws-gallery__main">
              {images.length > 0 ? (
                <img src={imageSrc(images[activeImage])} alt={listing.name} />
              ) : (
                <div className="ws-pcard__noimg">
                  <ImageOff size={24} aria-hidden />
                  No photos
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="ws-gallery__thumbs">
                {images.map((img, i) => (
                  <button
                    key={i}
                    className={`ws-thumb${i === activeImage ? ' is-active' : ''}`}
                    onClick={() => setActiveImage(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === activeImage}
                  >
                    <img src={imageSrc(img)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <h1 className="ws-h1" style={{ marginTop: 'var(--ws-space-6)' }}>{listing.name}</h1>

          <div className="ws-detail__price">
            <span className="ws-price ws-price--lg">{priceLabel(listing)}</span>
            {listing.isNegotiable && listing.priceType !== 'ON_REQUEST' && (
              <span className="ws-badge ws-badge--warning">Negotiable</span>
            )}
          </div>

          <p className="ws-detail__meta">
            {location && (<><MapPin size={14} aria-hidden /> {location}</>)}
            {listing.viewCount > 0 && (
              <>
                <span aria-hidden>·</span>
                <Eye size={14} aria-hidden />
                <span className="ws-num">{listing.viewCount}</span> views
              </>
            )}
          </p>

          <section className="ws-detail__section">
            <h2 className="ws-h2">Description</h2>
            <p className="ws-body ws-muted" style={{ whiteSpace: 'pre-wrap' }}>{listing.description}</p>
          </section>

          {specs.length > 0 && (
            <section className="ws-detail__section">
              <h2 className="ws-h2">Details</h2>
              <dl className="ws-spec">
                {specs.map((s, i) => (
                  <div className="ws-spec__row" key={`${s.label}-${i}`}>
                    <dt>{s.label}</dt>
                    <dd>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {listing.variants.length > 0 && (
            <section className="ws-detail__section">
              <h2 className="ws-h2">Options available</h2>
              <dl className="ws-spec">
                {listing.variants.map((v, i) => (
                  <div className="ws-spec__row" key={v.id ?? i}>
                    <dt>{v.name || Object.values(v.attributes).join(' / ')}</dt>
                    <dd className="ws-num">
                      {v.price != null ? fmtNaira(v.price) : '—'}
                      {v.isAvailable === false && (
                        <span className="ws-badge ws-badge--danger" style={{ marginLeft: 8 }}>Sold out</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {listing.tags.length > 0 && (
            <div className="ws-taglist">
              {listing.tags.map((t) => (
                <Link key={t} to={`/listings?search=${encodeURIComponent(t)}`} className="ws-tag">
                  {t}
                </Link>
              ))}
            </div>
          )}

          <ListingReviews listingId={listing.id} />

          {/* Understated and at the end: a prominent report control invites idle
              clicking, and the moderation queue is ranked by distinct reporters,
              so noise directly degrades the signal. */}
          <div style={{ marginTop: 'var(--ws-space-8)', textAlign: 'right' }}>
            <ReportButton
              targetType="LISTING"
              targetId={listing.id}
              targetName={listing.name}
              label="Report this listing"
            />
          </div>
        </div>

        {/* Contact rail — the point of the page. */}
        <div className="ws-aside">
          <ContactSeller listing={listing} />
          <SellerCard store={listing.store} />
        </div>
      </div>
    </div>
  );
}
