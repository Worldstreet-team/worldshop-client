import { useState, useEffect, useSyncExternalStore } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight, Clock, Eye, Heart, ImageOff, MapPin, Share2 } from 'lucide-react';
import { publicMarketplace, type Listing, type PublicListing, type PublicStore } from '@/services/storeService';
import ContactSeller from '@/components/marketplace/ContactSeller';
import SellerCard from '@/components/marketplace/SellerCard';
import ListingCard from '@/components/marketplace/ListingCard';
import ListingReviews from '@/components/marketplace/ListingReviews';
import ReportButton from '@/components/marketplace/ReportButton';
import { savedListings } from '@/utils/savedListings';
import { usePageTitle } from '@/hooks/usePageTitle';

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

/** "Listed 3 days ago" — coarse on purpose; freshness, not a timestamp. */
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
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState(false);
  // Keyed by the listing they were fetched for, so navigating to another
  // listing never flashes the previous one's rail — same pattern as Browse's
  // facetSource, and it avoids a reset-setState inside the effect.
  const [similarSource, setSimilarSource] = useState<{
    key: string;
    items: Array<Listing & { store: PublicStore }>;
  }>({ key: '', items: [] });

  usePageTitle(notFound ? 'Listing not available' : listing?.name);
  const saved = useSyncExternalStore(
    savedListings.subscribe,
    () => (listing ? savedListings.has(listing.id) : false),
  );

  // The gallery resets per listing during render, not in an effect — the
  // reconciliation pattern the repo already uses for Browse's price drafts.
  const [imageSeed, setImageSeed] = useState(idOrSlug);
  if (imageSeed !== idOrSlug) {
    setImageSeed(idOrSlug);
    setActiveImage(0);
  }

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;

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

  // Same-category rail so the page is not a dead end. Fetched after the
  // listing because the category id comes from it.
  const categoryId = listing?.category?.id ?? '';
  const listingId = listing?.id ?? '';
  const similarKey = `${categoryId}|${listingId}`;
  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    publicMarketplace
      .browse({ categoryId, limit: 5 })
      .then((res) => {
        if (!cancelled) {
          setSimilarSource({
            key: `${categoryId}|${listingId}`,
            items: res.data.filter((l) => l.id !== listingId).slice(0, 4),
          });
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [categoryId, listingId]);
  const similar = similarSource.key === similarKey ? similarSource.items : [];

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
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: listing.name, url });
                    } else {
                      await navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  } catch {
                    // Share sheet dismissed — nothing to do.
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

      {/* So the page is not a dead end once the buyer has read everything. */}
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
