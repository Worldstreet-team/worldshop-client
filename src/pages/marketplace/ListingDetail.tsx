import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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

  if (loading) return <div className="container"><p style={{ color: '#667085', padding: '2rem 0' }}>Loading…</p></div>;

  if (notFound || !listing) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h1>Listing not available</h1>
        <p style={{ color: '#667085', marginBottom: '1rem' }}>
          This listing may have been removed, or the seller's store is not currently active.
        </p>
        <Link to="/listings" className="btn-primary">Browse the marketplace</Link>
      </div>
    );
  }

  const images = (listing.images as ImageRef[]) ?? [];
  // One table: the split between category attributes and the seller's own
  // fields matters to search, not to the person reading the page.
  const specs = [
    ...(listing.condition ? [{ label: 'Condition', value: listing.condition.charAt(0) + listing.condition.slice(1).toLowerCase() }] : []),
    ...Object.entries(listing.attributes ?? {}).map(([label, value]) => ({ label, value: String(value) })),
    ...(listing.customFields ?? []),
  ];

  return (
    <div className="container listing-detail" style={{ padding: '1.5rem 0' }}>
      <nav style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '1rem' }}>
        <Link to="/listings">Marketplace</Link>
        {listing.category && (
          <> · <Link to={`/listings?categoryId=${listing.category.id}`}>{listing.category.name}</Link></>
        )}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          {/* Gallery */}
          {images.length > 0 ? (
            <>
              <img
                src={imageSrc(images[activeImage])}
                alt={listing.name}
                style={{ width: '100%', maxHeight: 460, objectFit: 'contain', background: '#f8f9fc', borderRadius: 8, border: '1px solid #e4e7ec' }}
              />
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      style={{
                        padding: 0, border: `2px solid ${i === activeImage ? '#101828' : '#e4e7ec'}`,
                        borderRadius: 6, cursor: 'pointer', background: 'none', lineHeight: 0,
                      }}
                    >
                      <img src={imageSrc(img)} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4 }} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ height: 240, background: '#f8f9fc', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#98a2b3' }}>
              No photos
            </div>
          )}

          <h1 style={{ marginTop: '1.25rem', marginBottom: '0.25rem' }}>{listing.name}</h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 700 }}>{priceLabel(listing)}</span>
            {listing.isNegotiable && listing.priceType !== 'ON_REQUEST' && (
              <span style={{ color: '#667085', fontSize: '0.9rem' }}>Negotiable</span>
            )}
          </div>

          <div style={{ color: '#667085', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            {[listing.city, listing.state].filter(Boolean).join(', ')}
            {listing.viewCount > 0 && <> · {listing.viewCount} view{listing.viewCount === 1 ? '' : 's'}</>}
          </div>

          <section style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Description</h2>
            <p style={{ whiteSpace: 'pre-wrap', color: '#344054', lineHeight: 1.6 }}>{listing.description}</p>
          </section>

          {specs.length > 0 && (
            <section style={{ marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem' }}>Details</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <tbody>
                    {specs.map((s, i) => (
                      <tr key={`${s.label}-${i}`}>
                        <td style={{ color: '#667085', width: '40%' }}>{s.label}</td>
                        <td><strong>{s.value}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {listing.variants.length > 0 && (
            <section style={{ marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem' }}>Options available</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>Price</th>
                      <th>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listing.variants.map((v, i) => (
                      <tr key={v.id ?? i}>
                        <td>
                          {v.name || Object.values(v.attributes).join(' / ')}
                        </td>
                        <td>{v.price != null ? fmtNaira(v.price) : '—'}</td>
                        <td>
                          {v.isAvailable === false
                            ? <span style={{ color: '#b42318' }}>Sold out</span>
                            : <span style={{ color: '#027a48' }}>Available</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <ListingReviews listingId={listing.id} />

          {/* Understated and at the end: a prominent report control invites idle
              clicking, and the moderation queue is ranked by distinct reporters,
              so noise directly degrades the signal. */}
          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <ReportButton
              targetType="LISTING"
              targetId={listing.id}
              targetName={listing.name}
              label="Report this listing"
            />
          </div>

          {listing.tags.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {listing.tags.map((t) => (
                <span key={t} style={{ background: '#f2f4f7', color: '#475467', padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.8rem' }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Contact rail — the point of the page. */}
        <div style={{ display: 'grid', gap: '1rem', position: 'sticky', top: '1rem' }}>
          <ContactSeller listing={listing} />
          <SellerCard store={listing.store} />
        </div>
      </div>
    </div>
  );
}
