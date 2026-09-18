import { useState, useSyncExternalStore } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Clock, Eye, Heart, ImageOff, MapPin, Share2 } from 'lucide-react';
import ContactSeller from '@/features/stores/components/ContactSeller';
import SellerCard from '@/features/stores/components/SellerCard';
import ListingCard from '@/features/listings/components/ListingCard';
import ListingReviews from '@/features/reviews/components/ListingReviews';
import ReportButton from '@/features/reports/components/ReportButton';
import { savedListings } from '@/features/listings/savedListings';
import { useListingDetail } from '@/features/listings/hooks/useListingDetail';
import { fmtNaira, imageSrc, priceLabel, type ImageRef } from '@/features/listings/model';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import { formatLocation } from '@/shared/utils/locations';

function listedAgo(iso: string): string | null {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'Listed today';
  if (days === 1) return 'Listed yesterday';
  if (days < 30) return `Listed ${days} days ago`;
  const months = Math.floor(days / 30);
  return `Listed ${months} month${months === 1 ? '' : 's'} ago`;
}

export default function ListingDetail() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { listing, loading, notFound, similar } = useListingDetail(idOrSlug);
  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState(false);

  usePageTitle(notFound ? 'Listing not available' : listing?.name);
  const saved = useSyncExternalStore(
    savedListings.subscribe,
    () => (listing ? savedListings.has(listing.id) : false),
  );

  const [imageSeed, setImageSeed] = useState(idOrSlug);
  if (imageSeed !== idOrSlug) {
    setImageSeed(idOrSlug);
    setActiveImage(0);
  }

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
  const location = formatLocation([listing.city, listing.state], listing.country);
  const stepImage = (delta: number) => {
    if (images.length < 2) return;
    setActiveImage((i) => (i + delta + images.length) % images.length);
  };
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
            <div
              className="ws-gallery__main"
              role="group"
              aria-roledescription="carousel"
              aria-label={`Photos of ${listing.name}`}
              tabIndex={images.length > 1 ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); stepImage(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); stepImage(-1); }
              }}
            >
              {images.length > 0 ? (
                <img src={imageSrc(images[activeImage])} alt={listing.name} />
              ) : (
                <div className="ws-pcard__noimg">
                  <ImageOff size={24} aria-hidden />
                  No photos
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ws-gallery__nav is-prev"
                    onClick={() => stepImage(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronRight size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ws-gallery__nav is-next"
                    onClick={() => stepImage(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={18} aria-hidden />
                  </button>
                  <span className="ws-gallery__count ws-num" aria-live="polite">
                    {activeImage + 1} / {images.length}
                  </span>
                </>
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

          <div className="ws-detail__titlerow">
            <h1 className="ws-h1">{listing.name}</h1>
            <div className="ws-detail__acts">
              <button
                type="button"
                className={`ws-iconbtn${saved ? ' is-saved' : ''}`}
                aria-pressed={saved}
                aria-label={saved ? 'Remove from saved' : 'Save listing'}
                title={saved ? 'Saved' : 'Save'}
                onClick={() => savedListings.toggle(listing)}
              >
                <Heart size={18} />
              </button>
              <button
                type="button"
                className="ws-iconbtn"
                aria-label="Share listing"
                title={copied ? 'Link copied' : 'Share'}
                onClick={async () => {
                  const url = window.location.href;
                  if (navigator.share) {
                    await navigator.share({ title: listing.name, url }).catch(() => undefined);
                    return;
                  }
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? <Check size={18} /> : <Share2 size={18} />}
              </button>
            </div>
          </div>

          <div className="ws-detail__price">
            <span className="ws-price ws-price--lg">{priceLabel(listing)}</span>
            {listing.isNegotiable && listing.priceType !== 'ON_REQUEST' && (
              <span className="ws-badge ws-badge--warning">Negotiable</span>
            )}
          </div>

          <p className="ws-detail__meta">
            {location && (<><MapPin size={14} aria-hidden /> {location}</>)}
            {listing.publishedAt && listedAgo(listing.publishedAt) && (
              <>
                <span aria-hidden>·</span>
                <Clock size={14} aria-hidden />
                {listedAgo(listing.publishedAt)}
              </>
            )}
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

          <div style={{ marginTop: 'var(--ws-space-8)', textAlign: 'right' }}>
            <ReportButton
              targetType="LISTING"
              targetId={listing.id}
              targetName={listing.name}
              label="Report this listing"
            />
          </div>
        </div>

        <div className="ws-aside" id="contact-panel">
          <ContactSeller listing={listing} />
          <SellerCard store={listing.store} />
        </div>
      </div>

      <div className="ws-actionbar">
        <div className="ws-actionbar__price">
          <span className="ws-price">{priceLabel(listing)}</span>
          {location && <span className="ws-actionbar__loc">{location}</span>}
        </div>
        <button
          type="button"
          className="ws-btn ws-btn--primary"
          onClick={() => {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            document.getElementById('contact-panel')
              ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
            document.getElementById('contact-message')?.focus({ preventScroll: true });
          }}
        >
          Message seller
        </button>
      </div>
      <div className="ws-actionbar__spacer" aria-hidden />

      {similar.length > 0 && listing.category && (
        <section className="ws-rail" aria-label="Similar listings" style={{ marginBlock: 'var(--ws-space-10)' }}>
          <div className="ws-rail__head">
            <h2 className="ws-h2">Similar listings</h2>
            <Link to={`/listings?categoryId=${listing.category.id}`} className="ws-rail__more">
              See all
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="ws-rail__track">
            {similar.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
          </div>
        </section>
      )}
    </div>
  );
}
